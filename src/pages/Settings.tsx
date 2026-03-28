import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LucideBell, LucideGlobe, LucideLock, LucideMapPin, LucideSave, LucideUser } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Topbar } from '../components/Topbar';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

type SectionId = 'profile' | 'regional' | 'security' | 'notifications';

const SECTIONS: Array<{ id: SectionId; labelKey: string; icon: any; kicker: string }> = [
  { id: 'profile', labelKey: 'settings:nav.profile', icon: LucideUser, kicker: 'ACTIVE' },
  { id: 'regional', labelKey: 'settings:nav.preferences', icon: LucideGlobe, kicker: 'GLOBAL' },
  { id: 'security', labelKey: 'settings:nav.security', icon: LucideLock, kicker: 'SECURE' },
  { id: 'notifications', labelKey: 'settings:nav.notifications', icon: LucideBell, kicker: 'SYNCED' },
];

export default function Settings() {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { profile, refreshProfile } = useAuthStore();
  const [active, setActive] = useState<SectionId>('profile');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', home_city: '', email: '' });

  useEffect(() => {
    setFormData({
      name: profile?.name ?? '',
      home_city: profile?.home_city ?? '',
      email: profile?.email ?? '',
    });
  }, [profile?.id, profile?.name, profile?.home_city, profile?.email]);

  const jumpTo = (id: SectionId) => {
    setActive(id);
    const el = document.getElementById(`settings-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const languageOptions = useMemo(() => ({
    en: { label: 'English' },
    ta: { label: 'Tamil' },
    hi: { label: 'Hindi' },
  }), []);

  const changeLanguage = (lng: keyof typeof languageOptions) => {
    i18n.changeLanguage(lng);
    toast.success(t('settings:toast.language_changed', { lng: languageOptions[lng].label }));
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          home_city: formData.home_city.trim() || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(t('settings:toast.success', 'Saved.'));
    } catch (err: any) {
      toast.error(err?.message || t('settings:toast.failed', 'Unable to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title={t('settings:title', 'Settings')} subtitle="Profile, language, security, and notifications." />

      <div className="page-scroll pb-24">
        <section className="hero-card card mb-6">
          <div className="hero-copy">
            <div className="section-label">SYSTEM</div>
            <h1 className="hero-title">{t('settings:header.title', 'System configuration')}</h1>
            <p className="hero-description">
              {t('settings:header.subtitle', 'Manage your business profile, localization, and operational preferences.')}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--topbar-height)+24px)] lg:self-start">
            <div className="card glass-card !p-4">
              <div className="section-label px-2">NAVIGATION</div>
              <div className="stack">
                {SECTIONS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <motion.button
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      key={item.id}
                      type="button"
                      onClick={() => jumpTo(item.id)}
                      className={cn(
                        'w-full rounded-[1.25rem] border px-4 py-4 text-left transition-all',
                        isActive
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_10px_30px_rgba(70,127,227,0.12)]'
                          : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'h-10 w-10 shrink-0 rounded-2xl border flex items-center justify-center',
                            isActive ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]',
                          )}>
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text)] truncate">
                              {t(item.labelKey)}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                              {item.kicker}
                            </div>
                          </div>
                        </div>
                        {isActive ? <div className="live-dot" /> : <div className="h-2 w-2 rounded-full bg-[var(--border)]" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="space-y-6 min-w-0">
            <section id="settings-profile" className="card glass-card">
              <div className="section-head">
                <div>
                  <div className="section-label">PROFILE</div>
                  <h2>{t('settings:sections.business_profile.title', 'Business profile')}</h2>
                  <p>{t('settings:sections.business_profile.subtitle', 'Update how your business appears across shipments and messages.')}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                    {t('settings:sections.business_profile.name', 'Name')}
                  </label>
                  <div className="relative mt-2">
                    <LucideUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="text-field pl-11"
                      placeholder={t('settings:sections.business_profile.placeholder_name', 'Your business name')}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                    {t('settings:sections.business_profile.hq_city', 'Home city')}
                  </label>
                  <div className="relative mt-2">
                    <LucideMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                    <input
                      value={formData.home_city}
                      onChange={(e) => setFormData((p) => ({ ...p, home_city: e.target.value }))}
                      className="text-field pl-11"
                      placeholder={t('settings:sections.business_profile.placeholder_city', 'City')}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                    {t('settings:sections.business_profile.email', 'Email')}
                  </label>
                  <input
                    value={formData.email}
                    readOnly
                    className="text-field mt-2 opacity-80"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
                  <div className="text-[11px] font-bold text-[var(--muted)]">
                    {profile?.id ? `ID: ${profile.id.slice(0, 8).toUpperCase()}` : t('settings:profile.missing', 'Profile not loaded yet.')}
                  </div>
                  <button type="submit" className="primary-button flex items-center gap-2" disabled={saving}>
                    <LucideSave size={16} />
                    <span>{saving ? t('common:saving', 'Saving...') : t('settings:sections.business_profile.save_button', 'Save changes')}</span>
                  </button>
                </div>
              </form>
            </section>

            <section id="settings-regional" className="card glass-card">
              <div className="section-head">
                <div>
                  <div className="section-label">REGIONAL</div>
                  <h2>{t('settings:sections.regional.title', 'Language')}</h2>
                  <p>{t('settings:sections.regional.subtitle', 'Switch language for the app UI.')}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(languageOptions) as Array<keyof typeof languageOptions>).map((code) => {
                  const isActive = i18n.language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => changeLanguage(code)}
                      className={cn('pill', isActive ? 'pill--active' : 'pill--muted')}
                    >
                      {languageOptions[code].label}
                    </button>
                  );
                })}
              </div>

              <div className="muted mt-4">
                {t('settings:sections.regional.note', 'Tip: the top bar language button cycles EN, TA, HI.')}
              </div>
            </section>

            <section id="settings-security" className="card glass-card">
              <div className="section-head">
                <div>
                  <div className="section-label">SECURITY</div>
                  <h2>{t('settings:sections.security.title', 'Security')}</h2>
                  <p>{t('settings:sections.security.subtitle', 'Session and permission controls.')}</p>
                </div>
              </div>

              <div className="message-card">
                <div className="section-label">STATUS</div>
                <div className="mt-3 text-sm font-black uppercase">{t('settings:sections.security.status', 'Authenticated via Supabase')}</div>
                <div className="muted mt-1">{t('settings:sections.security.note', 'Password and MFA settings can be added next.')}</div>
              </div>
            </section>

            <section id="settings-notifications" className="card glass-card">
              <div className="section-head">
                <div>
                  <div className="section-label">NOTIFICATIONS</div>
                  <h2>{t('settings:sections.notifications.title', 'Notifications')}</h2>
                  <p>{t('settings:sections.notifications.subtitle', 'Realtime alerts for shipments and messages.')}</p>
                </div>
              </div>

              <div className="message-card">
                <div className="section-label">COMING SOON</div>
                <div className="mt-3 text-sm font-black uppercase">{t('settings:sections.notifications.status', 'In-app alerts')}</div>
                <div className="muted mt-1">{t('settings:sections.notifications.note', 'We can wire this to message unread counts and booking milestones.')}</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

