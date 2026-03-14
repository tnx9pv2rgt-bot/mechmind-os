'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  AlertTriangle,
  Mail,
  Smartphone,
  MessageCircle,
  CheckCircle
} from 'lucide-react'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PortalPageWrapper } from '@/components/portal'
import { Customer, NotificationPreferences } from '@/lib/types/portal'

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalSettingsPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Profile form
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  // Password form
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: {
      enabled: true,
      bookingReminders: true,
      maintenanceAlerts: true,
      inspectionReports: true,
      promotions: false,
      newsletter: false,
    },
    sms: {
      enabled: true,
      bookingReminders: true,
      urgentAlerts: true,
    },
    whatsapp: {
      enabled: false,
      bookingReminders: false,
      statusUpdates: false,
    },
    push: {
      enabled: true,
      all: true,
    },
  })

  useEffect(() => {
    const loadData = async () => {
      const currentCustomer = null as Customer | null // TODO: Get from auth context
      setCustomer(currentCustomer)

      if (currentCustomer) {
        setProfile({
          firstName: currentCustomer.firstName,
          lastName: currentCustomer.lastName,
          email: currentCustomer.email,
          phone: currentCustomer.phone,
        })
      }

      setIsLoading(false)
    }

    loadData()
  }, [])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    // Mock API call
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  const handleSavePassword = async () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setPassword({ current: '', new: '', confirm: '' })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  const handleDeleteAccount = () => {
    if (confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.')) {
      alert('Richiesta di eliminazione account inviata.')
    }
  }

  if (isLoading) {
    return (
      <PortalPageWrapper title="Impostazioni" customer={customer || undefined}>
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full"
          />
        </div>
      </PortalPageWrapper>
    )
  }

  return (
    <PortalPageWrapper 
      title="Impostazioni"
      subtitle="Gestisci il tuo profilo e le preferenze"
      customer={customer || undefined}
    >
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl flex items-center gap-3"
        >
          <CheckCircle className="h-5 w-5 text-apple-green flex-shrink-0" />
          <p className="text-sm text-apple-green font-medium">Modifiche salvate con successo!</p>
        </motion.div>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full sm:w-auto mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profilo</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifiche</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sicurezza</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <AppleCard>
            <AppleCardHeader>
              <h2 className="text-lg font-semibold text-apple-dark dark:text-[#ececec] flex items-center gap-2">
                <User className="h-5 w-5 text-apple-blue" />
                Informazioni Personali
              </h2>
            </AppleCardHeader>
            <AppleCardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <AppleButton
                  onClick={handleSaveProfile}
                  loading={isSaving}
                  icon={<Save className="h-4 w-4" />}
                >
                  Salva Modifiche
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <AppleCard>
            <AppleCardHeader>
              <h2 className="text-lg font-semibold text-apple-dark dark:text-[#ececec] flex items-center gap-2">
                <Lock className="h-5 w-5 text-apple-blue" />
                Cambia Password
              </h2>
            </AppleCardHeader>
            <AppleCardContent className="p-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Password Attuale</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nuova Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <AppleButton
                  onClick={handleSavePassword}
                  loading={isSaving}
                  disabled={!password.current || !password.new || password.new !== password.confirm}
                >
                  Aggiorna Password
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="space-y-4">
            {/* Email Notifications */}
            <AppleCard>
              <AppleCardHeader>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-apple-blue" />
                  <h2 className="text-lg font-semibold text-apple-dark dark:text-[#ececec]">Email</h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-apple-dark dark:text-[#ececec]">Notifiche email</p>
                    <p className="text-sm text-apple-gray dark:text-[#636366]">Ricevi aggiornamenti via email</p>
                  </div>
                  <Switch
                    checked={notifications.email.enabled}
                    onCheckedChange={(checked) => 
                      setNotifications({
                        ...notifications,
                        email: { ...notifications.email, enabled: checked }
                      })
                    }
                  />
                </div>
                {notifications.email.enabled && (
                  <div className="pl-4 border-l-2 border-apple-border dark:border-[#424242] space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.email.bookingReminders}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          email: { ...notifications.email, bookingReminders: e.target.checked }
                        })}
                        className="rounded border-apple-border"
                      />
                      <span className="text-sm text-apple-dark dark:text-[#ececec]">Promemoria prenotazioni</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.email.maintenanceAlerts}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          email: { ...notifications.email, maintenanceAlerts: e.target.checked }
                        })}
                        className="rounded border-apple-border"
                      />
                      <span className="text-sm text-apple-dark dark:text-[#ececec]">Avvisi manutenzione</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.email.inspectionReports}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          email: { ...notifications.email, inspectionReports: e.target.checked }
                        })}
                        className="rounded border-apple-border"
                      />
                      <span className="text-sm text-apple-dark dark:text-[#ececec]">Report ispezioni</span>
                    </label>
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>

            {/* SMS Notifications */}
            <AppleCard>
              <AppleCardHeader>
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-apple-green" />
                  <h2 className="text-lg font-semibold text-apple-dark dark:text-[#ececec]">SMS</h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-apple-dark dark:text-[#ececec]">Notifiche SMS</p>
                    <p className="text-sm text-apple-gray dark:text-[#636366]">Ricevi messaggi urgenti</p>
                  </div>
                  <Switch
                    checked={notifications.sms.enabled}
                    onCheckedChange={(checked) => 
                      setNotifications({
                        ...notifications,
                        sms: { ...notifications.sms, enabled: checked }
                      })
                    }
                  />
                </div>
              </AppleCardContent>
            </AppleCard>

            {/* WhatsApp Notifications */}
            <AppleCard>
              <AppleCardHeader>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-apple-green" />
                  <h2 className="text-lg font-semibold text-apple-dark dark:text-[#ececec]">WhatsApp</h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-apple-dark dark:text-[#ececec]">Notifiche WhatsApp</p>
                    <p className="text-sm text-apple-gray dark:text-[#636366]">Ricevi aggiornamenti su WhatsApp</p>
                  </div>
                  <Switch
                    checked={notifications.whatsapp.enabled}
                    onCheckedChange={(checked) => 
                      setNotifications({
                        ...notifications,
                        whatsapp: { ...notifications.whatsapp, enabled: checked }
                      })
                    }
                  />
                </div>
              </AppleCardContent>
            </AppleCard>

            <div className="flex justify-end">
              <AppleButton
                onClick={handleSaveProfile}
                loading={isSaving}
                icon={<Save className="h-4 w-4" />}
              >
                Salva Preferenze
              </AppleButton>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-4">
            <AppleCard>
              <AppleCardHeader>
                <h2 className="text-lg font-semibold text-apple-dark dark:text-[#ececec] flex items-center gap-2">
                  <Shield className="h-5 w-5 text-apple-blue" />
                  Autenticazione a Due Fattori
                </h2>
              </AppleCardHeader>
              <AppleCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-apple-dark dark:text-[#ececec]">2FA non attivo</p>
                    <p className="text-sm text-apple-gray dark:text-[#636366]">Aggiungi un livello di sicurezza extra</p>
                  </div>
                  <AppleButton variant="secondary" size="sm">
                    Attiva
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>

            <AppleCard className="border-red-200">
              <AppleCardHeader>
                <h2 className="text-lg font-semibold text-apple-red flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Elimina Account
                </h2>
              </AppleCardHeader>
              <AppleCardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-5 w-5 text-apple-red flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-apple-dark dark:text-[#ececec] mb-2">
                      L&apos;eliminazione dell&apos;account è irreversibile. Tutti i tuoi dati verranno cancellati 
                      in conformità con il GDPR.
                    </p>
                    <AppleButton
                      variant="ghost"
                      className="text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={handleDeleteAccount}
                    >
                      Richiedi eliminazione account
                    </AppleButton>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </div>
        </TabsContent>
      </Tabs>
    </PortalPageWrapper>
  )
}
