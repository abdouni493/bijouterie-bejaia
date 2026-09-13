/**
 * ─── AUTHENTICATION ──────────────────────────────────────────────────────────
 * Both the administrator and every employee are real Supabase auth users, so
 * they sign in with the ordinary email + password flow and get a JWT that the
 * row-level-security policies read.
 *
 * The one unusual entry point is `bootstrapAdmin`: a brand-new shop has no
 * account at all, so the login screen offers to create the first administrator.
 * The RPC behind it refuses the moment an admin exists, which is what makes the
 * button a one-time affair rather than a way in.
 */
import { supabase } from './supabase';
import type { User, Language, Role } from '../types';

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: Role;
  language: Language;
  workerId: string | null;
  isActive: boolean;
}

export interface StaffRow {
  userId: string;
  workerId: string | null;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  permissions: string[];
}

/** Turns a Supabase error into a message the shop owner can act on. */
export const authErrorMessage = (e: any, language: Language = 'fr'): string => {
  const raw = String(e?.message || e?.error_description || e || '');
  const ar = language === 'ar';

  if (/ADMIN_ALREADY_EXISTS/i.test(raw))
    return ar ? 'تم إنشاء حساب المدير مسبقاً.' : 'Un compte administrateur existe déjà.';
  if (/EMAIL_ALREADY_EXISTS|already registered|User already/i.test(raw))
    return ar ? 'هذا البريد الإلكتروني مستعمل بالفعل.' : 'Cette adresse email est déjà utilisée.';
  if (/PASSWORD_TOO_SHORT|Password should be/i.test(raw))
    return ar ? 'كلمة السر يجب أن تكون 6 أحرف على الأقل.' : 'Le mot de passe doit contenir au moins 6 caractères.';
  if (/EMAIL_REQUIRED/i.test(raw))
    return ar ? 'البريد الإلكتروني مطلوب.' : 'Une adresse email est requise.';
  if (/Invalid login credentials/i.test(raw))
    return ar ? 'البريد الإلكتروني أو كلمة السر غير صحيحة.' : 'Email ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(raw))
    return ar ? 'لم يتم تأكيد البريد الإلكتروني.' : "L'adresse email n'a pas été confirmée.";
  if (/NOT_AUTHORIZED/i.test(raw))
    return ar ? 'ليست لديك الصلاحية للقيام بهذا.' : "Vous n'avez pas la permission d'effectuer cette action.";
  if (/CANNOT_RESTRICT_ADMIN/i.test(raw))
    return ar ? 'المدير يملك كل الصلاحيات دائماً.' : 'Un administrateur détient toujours toutes les permissions.';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(raw))
    return ar ? 'تعذّر الاتصال بالخادم. تحقق من الإنترنت.' : 'Connexion au serveur impossible. Vérifiez votre réseau.';
  if (/schema .*does not exist|relation .* does not exist|Could not find the function/i.test(raw))
    return ar
      ? 'قاعدة البيانات غير مهيأة. شغّل ملفات SQL في مجلد supabase/.'
      : "La base de données n'est pas initialisée. Exécutez les fichiers SQL du dossier supabase/.";

  return raw || (ar ? 'حدث خطأ غير متوقع.' : 'Une erreur inattendue est survenue.');
};

/** Does this shop already have an administrator? Callable while signed out. */
export const adminExists = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('admin_exists');
  if (error) throw error;
  return !!data;
};

/** Creates the very first administrator, then signs them in. */
export const bootstrapAdmin = async (
  email: string, password: string, username: string
): Promise<void> => {
  const { error } = await supabase.rpc('bootstrap_admin', {
    p_email: email.trim().toLowerCase(),
    p_password: password,
    p_username: username.trim() || 'Administrateur',
  });
  if (error) throw error;

  // The account is ready and confirmed — sign straight in.
  await signIn(email, password);
};

export const signIn = async (email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

/** The signed-in user's profile row, or null when signed out. */
export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, role, language, worker_id, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    role: data.role,
    language: data.language,
    workerId: data.worker_id,
    isActive: data.is_active,
  };
};

/** Every permission key the signed-in user holds (admins get all of them). */
export const fetchMyPermissions = async (): Promise<string[]> => {
  const { data, error } = await supabase.rpc('my_permissions');
  if (error) throw error;
  return (data || []).map((r: any) => r.key);
};

export const profileToUser = (p: Profile, language: Language): User => ({
  id: p.id,
  username: p.username,
  email: p.email,
  role: p.role,
  language: p.language || language,
});

// ─── Staff administration (admin only) ──────────────────────────────────────

export const listStaff = async (): Promise<StaffRow[]> => {
  const { data, error } = await supabase.rpc('list_staff');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    workerId: r.worker_id,
    fullName: r.full_name,
    email: r.email,
    role: r.role,
    isActive: r.is_active,
    permissions: r.permissions || [],
  }));
};

export interface NewWorkerInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  address?: string;
  paymentType?: 'monthly' | 'daily';
  salary?: number;
  username?: string;
  permissions?: string[];
  workerId?: string;
}

/** Creates a worker's auth account, payroll row and permission set in one call. */
export const createWorkerAccount = async (input: NewWorkerInput): Promise<{ userId: string; workerId: string }> => {
  const { data, error } = await supabase.rpc('create_worker_account', {
    p_email: input.email.trim().toLowerCase(),
    p_password: input.password,
    p_full_name: input.fullName,
    p_phone: input.phone || '',
    p_address: input.address || '',
    p_payment_type: input.paymentType || 'monthly',
    p_salary: input.salary || 0,
    p_username: input.username || null,
    p_permissions: input.permissions && input.permissions.length ? input.permissions : null,
    p_worker_id: input.workerId || null,
  });
  if (error) throw error;
  return { userId: (data as any).user_id, workerId: (data as any).worker_id };
};

/** Replaces a worker's permission set — anything omitted is revoked. */
export const setUserPermissions = async (userId: string, permissions: string[]): Promise<void> => {
  const { error } = await supabase.rpc('set_user_permissions', {
    p_user_id: userId,
    p_permissions: permissions,
  });
  if (error) throw error;
};

export const setWorkerPassword = async (userId: string, password: string): Promise<void> => {
  const { error } = await supabase.rpc('set_worker_password', {
    p_user_id: userId,
    p_password: password,
  });
  if (error) throw error;
};

export const deleteWorkerAccount = async (workerId: string): Promise<void> => {
  const { error } = await supabase.rpc('delete_worker_account', { p_worker_id: workerId });
  if (error) throw error;
};
