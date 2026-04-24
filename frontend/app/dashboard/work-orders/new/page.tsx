'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Wrench,
  Loader2,
  Search,
  User,
  Car,
  Plus,
  Trash2,
  ClipboardList,
  ArrowLeft,
  Save,
  Gauge,
  Fuel,
  Clock,
  MapPin,
  Key,
  FileText,
  Shield,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Euro,
  Pen,
  Megaphone,
  Truck,
  Clipboard,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

// =============================================================================
// Animation Variants
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// =============================================================================
// Schema
// =============================================================================
const lineItemSchema = z.object({
  description: z.string().min(1, 'Descrizione obbligatoria'),
  customerConcern: z.string().optional(),
  cause: z.string().optional(),
  correction: z.string().optional(),
  estimatedHours: z.coerce.number().min(0, 'Valore non valido').optional(),
  estimatedCost: z.coerce.number().min(0, 'Valore non valido').optional(),
  laborRate: z.coerce.number().min(0).optional(),
  laborType: z.string().optional(),
  opCode: z.string().optional(),
  technicianId: z.string().optional(),
  authorized: z.boolean().optional(),
  isSublet: z.boolean().optional(),
  subletVendor: z.string().optional(),
  warrantyType: z.string().optional(),
});

const schema = z.object({
  // Base
  customerId: z.string().min(1, 'Seleziona un cliente'),
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  woType: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),

  // Vehicle Intake
  mileageIn: z.coerce.number().min(0, 'Km non valido').optional(),
  fuelLevelIn: z.string().optional(),
  parkingSpot: z.string().optional(),
  keyTag: z.string().optional(),
  preExistingDamage: z.string().optional(),
  testDriveBefore: z.boolean().optional(),
  recallCheckDone: z.boolean().optional(),

  // Diagnosis
  customerRequest: z.string().optional(),
  diagnosis: z.string().optional(),

  // Assignment
  technicianId: z.string().optional(),
  serviceAdvisorId: z.string().optional(),
  assignedBayId: z.string().optional(),

  // Timing
  estimatedCompletion: z.string().optional(),
  estimatedPickup: z.string().optional(),

  // Logistics
  dropOffType: z.string().optional(),
  courtesyCarRequested: z.boolean().optional(),
  courtesyCarPlate: z.string().optional(),
  preferredContact: z.string().optional(),

  // Financial
  preAuthAmount: z.coerce.number().min(0).optional(),
  taxExempt: z.boolean().optional(),
  taxExemptCert: z.string().optional(),
  marketingSource: z.string().optional(),

  // Notes
  internalNotes: z.string().optional(),
  customerVisibleNotes: z.string().optional(),

  // Line Items
  lineItems: z.array(lineItemSchema),

  // Booking link
  bookingId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// =============================================================================
// Types
// =============================================================================
interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  fiscalCode?: string;
  vatNumber?: string;
}

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  licensePlate?: string;
  plate?: string;
  year?: number;
  vin?: string;
  color?: string;
  mileage?: number;
}

interface TechnicianOption {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface BayOption {
  id: string;
  name: string;
  status: string;
}

interface CannedJob {
  id: string;
  name: string;
  description?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  opCode?: string;
}

interface BookingOption {
  id: string;
  date: string;
  service?: string;
  status: string;
}

// =============================================================================
// Constants
// =============================================================================
const WO_TYPES = [
  { value: 'CUSTOMER_PAY', label: 'Pagamento Cliente', icon: Euro },
  { value: 'WARRANTY', label: 'Garanzia', icon: Shield },
  { value: 'INTERNAL', label: 'Interno', icon: Wrench },
  { value: 'FLEET', label: 'Flotta', icon: Truck },
  { value: 'GOODWILL', label: 'Goodwill', icon: CheckCircle2 },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa', color: 'text-[var(--text-tertiary)]' },
  { value: 'NORMAL', label: 'Normale', color: 'text-[var(--brand)]' },
  { value: 'HIGH', label: 'Alta', color: 'text-[var(--status-warning)]' },
  { value: 'URGENT', label: 'Urgente', color: 'text-[var(--status-error)]' },
] as const;

const FUEL_LEVELS = [
  { value: 'EMPTY', label: 'Vuoto', width: '5%' },
  { value: 'QUARTER', label: '1/4', width: '25%' },
  { value: 'HALF', label: '1/2', width: '50%' },
  { value: 'THREE_QUARTERS', label: '3/4', width: '75%' },
  { value: 'FULL', label: 'Pieno', width: '100%' },
] as const;

const DROP_OFF_TYPES = [
  { value: 'WAIT', label: 'Attende in officina' },
  { value: 'DROP_OFF', label: 'Lascia il veicolo' },
  { value: 'SHUTTLE', label: 'Navetta' },
  { value: 'LOANER', label: 'Auto sostitutiva' },
  { value: 'RENTAL', label: 'Noleggio' },
] as const;

const CONTACT_METHODS = [
  { value: 'PHONE', label: 'Telefono' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
] as const;

const LABOR_TYPES = [
  { value: 'FLAT_RATE', label: 'Forfettario' },
  { value: 'ACTUAL_TIME', label: 'Tempo effettivo' },
  { value: 'MENU', label: 'Prezzo fisso' },
] as const;

const WARRANTY_TYPES = [
  { value: '', label: 'Nessuna' },
  { value: 'MANUFACTURER', label: 'Casa madre' },
  { value: 'EXTENDED', label: 'Estesa' },
  { value: 'SHOP', label: 'Officina' },
  { value: 'GOODWILL', label: 'Goodwill' },
] as const;

const MARKETING_SOURCES = [
  { value: '', label: 'Non specificato' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'REFERRAL', label: 'Passaparola' },
  { value: 'SOCIAL', label: 'Social media' },
  { value: 'RECALL', label: 'Richiamo' },
  { value: 'RETURN', label: 'Cliente abituale' },
  { value: 'WALK_IN', label: 'Passaggio' },
  { value: 'FLEET', label: 'Contratto flotta' },
  { value: 'OTHER', label: 'Altro' },
] as const;

const selectClass = 'w-full h-10 px-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer';

const textareaClass = 'w-full rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] px-4 py-3 outline-none text-body resize-none focus:ring-2 focus:ring-apple-blue';

const labelClass = 'text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1.5 block';

// =============================================================================
// Section Header Component
// =============================================================================
function SectionHeader({ icon: Icon, title, subtitle, number }: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  number: number;
}): React.ReactElement {
  return (
    <AppleCardHeader>
      <div className="flex items-center gap-3 w-full">
        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 dark:bg-[var(--brand)]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-footnote font-bold text-[var(--brand)]">{number}</span>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Icon className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
          <div>
            <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{title}</h2>
            {subtitle && <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{subtitle}</p>}
          </div>
        </div>
      </div>
    </AppleCardHeader>
  );
}

// =============================================================================
// Collapsible Section
// =============================================================================
function CollapsibleSection({ defaultOpen = true, children, icon: Icon, title, subtitle, number }: {
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  number: number;
}): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <AppleCard hover={false}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-secondary)]/20 dark:hover:bg-[var(--surface-hover)] transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 dark:bg-[var(--brand)]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-footnote font-bold text-[var(--brand)]">{number}</span>
          </div>
          <Icon className="h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
          <div className="text-left">
            <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{title}</h2>
            {subtitle && <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{subtitle}</p>}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />}
      </button>
      {open && <AppleCardContent>{children}</AppleCardContent>}
    </AppleCard>
  );
}

// =============================================================================
// Live Total Component
// =============================================================================
function LiveTotal({ lineItems }: { lineItems: FormValues['lineItems'] }): React.ReactElement {
  const totals = useMemo(() => {
    let laborTotal = 0;
    let partsTotal = 0;
    lineItems.forEach((item) => {
      const hours = item.estimatedHours || 0;
      const rate = item.laborRate || 45;
      laborTotal += hours * rate;
      partsTotal += item.estimatedCost || 0;
    });
    const subtotal = laborTotal + partsTotal;
    const iva = subtotal * 0.22;
    const total = subtotal + iva;
    return { laborTotal, partsTotal, subtotal, iva, total };
  }, [lineItems]);

  return (
    <div className="bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] rounded-2xl p-4 space-y-2">
      <div className="flex justify-between text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
        <span>Manodopera</span>
        <span className="tabular-nums">{totals.laborTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
      </div>
      <div className="flex justify-between text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
        <span>Materiali/Ricambi</span>
        <span className="tabular-nums">{totals.partsTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
      </div>
      <div className="border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] pt-2 flex justify-between text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">
        <span>Imponibile</span>
        <span className="font-semibold tabular-nums">{totals.subtotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
      </div>
      <div className="flex justify-between text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
        <span>IVA 22%</span>
        <span className="tabular-nums">{totals.iva.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
      </div>
      <div className="border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] pt-2 flex justify-between">
        <span className="text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Totale stimato</span>
        <span className="text-title-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] tabular-nums">{totals.total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function NewWorkOrderPage(): React.ReactElement {
  const router = useRouter();

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Vehicle
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);

  // Technicians
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(true);

  // Bays
  const [bays, setBays] = useState<BayOption[]>([]);

  // Canned jobs
  const [cannedJobs, setCannedJobs] = useState<CannedJob[]>([]);
  const [cannedJobsDialogOpen, setCannedJobsDialogOpen] = useState(false);
  const [cannedJobsLoading, setCannedJobsLoading] = useState(false);

  // Expanded line item (for 3C details)
  const [expandedLine, setExpandedLine] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: '',
      vehicleId: '',
      woType: 'CUSTOMER_PAY',
      priority: 'NORMAL',
      mileageIn: undefined,
      fuelLevelIn: '',
      parkingSpot: '',
      keyTag: '',
      preExistingDamage: '',
      testDriveBefore: false,
      recallCheckDone: false,
      customerRequest: '',
      diagnosis: '',
      technicianId: '',
      serviceAdvisorId: '',
      assignedBayId: '',
      estimatedCompletion: '',
      estimatedPickup: '',
      dropOffType: 'DROP_OFF',
      courtesyCarRequested: false,
      courtesyCarPlate: '',
      preferredContact: 'PHONE',
      preAuthAmount: undefined,
      taxExempt: false,
      taxExemptCert: '',
      marketingSource: '',
      internalNotes: '',
      customerVisibleNotes: '',
      lineItems: [],
      bookingId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const customerId = watch('customerId');
  const watchedWoType = watch('woType');
  const watchedDropOff = watch('dropOffType');
  const watchedCourtesy = watch('courtesyCarRequested');
  const watchedTaxExempt = watch('taxExempt');
  const watchedLineItems = watch('lineItems');
  const watchedFuel = watch('fuelLevelIn');

  // =========================================================================
  // Data Loading
  // =========================================================================

  // Customer Search
  const searchCustomers = useCallback(async (query: string): Promise<void> => {
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Errore');
      const json = await res.json();
      const data = json.data ?? json ?? [];
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const selectCustomer = (c: CustomerOption): void => {
    setSelectedCustomer(c);
    setValue('customerId', c.id, { shouldValidate: true });
    setCustomerSearch([c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || '');
    setShowCustomerDropdown(false);
    setValue('vehicleId', '');
    setSelectedVehicle(null);
    // Auto-set tax exempt for business customers
    if (c.vatNumber) {
      setValue('taxExempt', false); // They have VAT but still need to check
    }
  };

  // Load Vehicles
  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      return;
    }
    async function loadVehicles(): Promise<void> {
      setVehiclesLoading(true);
      try {
        const res = await fetch(`/api/vehicles?customerId=${customerId}`);
        if (!res.ok) throw new Error('Errore');
        const json = await res.json();
        setVehicles(json.data ?? json ?? []);
      } catch {
        setVehicles([]);
      } finally {
        setVehiclesLoading(false);
      }
    }
    loadVehicles();
  }, [customerId]);

  const handleVehicleChange = (vehicleId: string): void => {
    setValue('vehicleId', vehicleId, { shouldValidate: true });
    const v = vehicles.find((veh) => veh.id === vehicleId);
    setSelectedVehicle(v || null);
    if (v?.mileage) {
      setValue('mileageIn', v.mileage);
    }
  };

  // Load Technicians
  useEffect(() => {
    async function loadTechnicians(): Promise<void> {
      try {
        const res = await fetch('/api/technicians');
        if (!res.ok) throw new Error('Errore');
        const json = await res.json();
        setTechnicians(json.data ?? json ?? []);
      } catch {
        setTechnicians([]);
      } finally {
        setTechniciansLoading(false);
      }
    }
    loadTechnicians();
  }, []);

  // Load Bays
  useEffect(() => {
    async function loadBays(): Promise<void> {
      try {
        const res = await fetch('/api/locations/bays');
        if (!res.ok) return;
        const json = await res.json();
        setBays(json.data ?? json ?? []);
      } catch {
        setBays([]);
      }
    }
    loadBays();
  }, []);

  // Canned Jobs
  const openCannedJobsDialog = async (): Promise<void> => {
    setCannedJobsDialogOpen(true);
    if (cannedJobs.length === 0) {
      setCannedJobsLoading(true);
      try {
        const res = await fetch('/api/canned-jobs');
        if (!res.ok) throw new Error('Errore');
        const json = await res.json();
        setCannedJobs(json.data ?? json ?? []);
      } catch {
        setCannedJobs([]);
      } finally {
        setCannedJobsLoading(false);
      }
    }
  };

  const addCannedJob = (job: CannedJob): void => {
    append({
      description: job.name + (job.description ? ` — ${job.description}` : ''),
      customerConcern: '',
      cause: '',
      correction: '',
      estimatedHours: job.estimatedHours || 0,
      estimatedCost: job.estimatedCost || 0,
      laborRate: undefined,
      laborType: 'FLAT_RATE',
      opCode: job.opCode || '',
      technicianId: '',
      authorized: true,
      isSublet: false,
      subletVendor: '',
      warrantyType: '',
    });
    toast.success(`"${job.name}" aggiunto`);
  };

  // =========================================================================
  // Submit
  // =========================================================================
  const onSubmit = async (data: FormValues): Promise<void> => {
    try {
      const body: Record<string, unknown> = {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        woType: data.woType || 'CUSTOMER_PAY',
        priority: data.priority,
        customerRequest: data.customerRequest || undefined,
        diagnosis: data.diagnosis || undefined,
        mileageIn: data.mileageIn || undefined,
        technicianId: data.technicianId || undefined,
        serviceAdvisorId: data.serviceAdvisorId || undefined,
        assignedBayId: data.assignedBayId || undefined,
        bookingId: data.bookingId || undefined,
        estimatedCompletion: data.estimatedCompletion || undefined,
        estimatedPickup: data.estimatedPickup || undefined,
        dropOffType: data.dropOffType || undefined,
        courtesyCarRequested: data.courtesyCarRequested || false,
        courtesyCarPlate: data.courtesyCarPlate || undefined,
        preferredContact: data.preferredContact || undefined,
        preAuthAmount: data.preAuthAmount || undefined,
        taxExempt: data.taxExempt || false,
        taxExemptCert: data.taxExemptCert || undefined,
        marketingSource: data.marketingSource || undefined,
        internalNotes: data.internalNotes || undefined,
        customerVisibleNotes: data.customerVisibleNotes || undefined,
        preExistingDamage: data.preExistingDamage || undefined,
        testDriveBefore: data.testDriveBefore || false,
        recallCheckDone: data.recallCheckDone || false,
        parkingSpot: data.parkingSpot || undefined,
        keyTag: data.keyTag || undefined,
      };

      if (data.lineItems.length > 0) {
        body.lineItems = data.lineItems.map((li) => ({
          description: li.description,
          customerConcern: li.customerConcern || undefined,
          cause: li.cause || undefined,
          correction: li.correction || undefined,
          estimatedHours: li.estimatedHours || undefined,
          estimatedCost: li.estimatedCost || undefined,
          laborRate: li.laborRate || undefined,
          laborType: li.laborType || undefined,
          opCode: li.opCode || undefined,
          technicianId: li.technicianId || undefined,
          authorized: li.authorized ?? true,
          isSublet: li.isSublet || false,
          subletVendor: li.subletVendor || undefined,
          warrantyType: li.warrantyType || undefined,
        }));
      }

      const res = await fetch('/api/dashboard/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Errore creazione ordine di lavoro');
      }
      const newId = json.data?.id || json.id;
      toast.success('Ordine di lavoro creato con successo');
      router.push(`/dashboard/work-orders/${newId || ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    }
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'OdL', href: '/dashboard/work-orders' },
            { label: 'Nuovo Ordine' },
          ]} />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <AppleButton
                variant='ghost'
                size='sm'
                onClick={() => router.push('/dashboard/work-orders')}
                icon={<ArrowLeft className='h-4 w-4' />}
                aria-label='Torna agli ordini'
                className='min-w-[44px]'
              />
              <div>
                <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Nuovo Ordine di Lavoro</h1>
                <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-0.5'>
                  Compila tutti i dettagli per creare un OdL professionale
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <AppleButton
                type="button"
                variant="ghost"
                onClick={() => router.push('/dashboard/work-orders')}
              >
                Annulla
              </AppleButton>
              <AppleButton
                type="submit"
                form="wo-form"
                loading={isSubmitting}
                icon={<Save className="h-4 w-4" />}
              >
                Crea OdL
              </AppleButton>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 max-w-4xl mx-auto"
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        <form id="wo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ============================================================= */}
          {/* 1. TIPO OdL + PRIORITA */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={FileText} title="Tipo Ordine e Priorità" number={1} />
              <AppleCardContent className="space-y-4">
                {/* WO Type */}
                <div>
                  <label className={labelClass}>Tipo Ordine di Lavoro</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {WO_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = watchedWoType === type.value;
                      return (
                        <label key={type.value} className="cursor-pointer">
                          <input
                            type="radio"
                            value={type.value}
                            {...register('woType')}
                            className="sr-only peer"
                          />
                          <div className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all min-h-[72px] justify-center ${
                            isSelected
                              ? 'border-[var(--brand)] bg-[var(--brand)]/5 dark:bg-[var(--brand)]/10'
                              : 'border-[var(--border-default)]/30 dark:border-[var(--border-default)] hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)]'
                          }`}>
                            <Icon className={`h-5 w-5 ${isSelected ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'}`} />
                            <span className={`text-footnote font-medium text-center ${isSelected ? 'text-[var(--brand)]' : 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'}`}>
                              {type.label}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className={labelClass}>Priorità</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value={opt.value}
                          {...register('priority')}
                          className="sr-only peer"
                        />
                        <span className={`px-4 py-2.5 rounded-full text-footnote font-medium border transition-all min-h-[40px] flex items-center peer-checked:border-[var(--brand)] peer-checked:bg-[var(--brand)]/10 dark:peer-checked:bg-[var(--brand)]/20 peer-checked:text-[var(--brand)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)]`}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Marketing Source */}
                <div>
                  <label className={labelClass}>Come ci ha trovato il cliente</label>
                  <select {...register('marketingSource')} className={selectClass}>
                    {MARKETING_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 2. CLIENTE + VEICOLO */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={User} title="Cliente e Veicolo" subtitle="Seleziona cliente e veicolo" number={2} />
              <AppleCardContent className="space-y-5">
                {/* Customer Search */}
                <div>
                  <label className={labelClass}>Cliente *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (selectedCustomer) {
                          setSelectedCustomer(null);
                          setValue('customerId', '', { shouldValidate: true });
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Cerca per nome, email, P.IVA..."
                      className='w-full h-10 pl-10 pr-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-apple-gray/60 dark:placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-apple-blue'
                      autoComplete="off"
                    />
                    {customerSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--brand)]" />
                    )}
                    {showCustomerDropdown && customerResults.length > 0 && !selectedCustomer && (
                      <div className="absolute z-50 w-full mt-1 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] border border-[var(--border-default)]/30 dark:border-[var(--border-default)] rounded-xl shadow-apple dark:shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-active)] transition-colors min-h-[44px]"
                          >
                            <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || 'Cliente'}
                            </p>
                            <div className="flex gap-3">
                              {c.email && <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{c.email}</span>}
                              {c.phone && <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{c.phone}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="mt-2 p-3 rounded-xl bg-[var(--status-success)]/5 dark:bg-[var(--status-success)]/40/10 border border-apple-green/20 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--status-success)] flex-shrink-0" />
                      <p className="text-footnote text-[var(--status-success)] dark:text-[var(--status-success)]">
                        {[selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ')}
                        {selectedCustomer.vatNumber && <span className="ml-2 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">P.IVA: {selectedCustomer.vatNumber}</span>}
                      </p>
                    </div>
                  )}
                  {errors.customerId && <p className="text-footnote text-[var(--status-error)] mt-1">{errors.customerId.message}</p>}
                </div>

                {/* Vehicle */}
                <div>
                  <label className={labelClass}>Veicolo *</label>
                  <select
                    value={watch('vehicleId')}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    disabled={!customerId || vehiclesLoading}
                    className={selectClass}
                  >
                    <option value="">
                      {!customerId ? 'Seleziona prima un cliente' : vehiclesLoading ? 'Caricamento...' : 'Seleziona un veicolo'}
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} — {v.licensePlate || v.plate} {v.year ? `(${v.year})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.vehicleId && <p className="text-footnote text-[var(--status-error)] mt-1">{errors.vehicleId.message}</p>}

                  {/* Vehicle Info Card */}
                  {selectedVehicle && (
                    <div className="mt-2 p-3 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {selectedVehicle.vin && (
                        <div>
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">VIN</p>
                          <p className="text-footnote font-mono text-[var(--text-primary)] dark:text-[var(--text-primary)]">{selectedVehicle.vin}</p>
                        </div>
                      )}
                      {selectedVehicle.color && (
                        <div>
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Colore</p>
                          <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">{selectedVehicle.color}</p>
                        </div>
                      )}
                      {selectedVehicle.year && (
                        <div>
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Anno</p>
                          <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">{selectedVehicle.year}</p>
                        </div>
                      )}
                      {selectedVehicle.mileage && (
                        <div>
                          <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ultimo Km</p>
                          <p className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] tabular-nums">{selectedVehicle.mileage.toLocaleString('it-IT')} km</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Preferred Contact */}
                <div>
                  <label className={labelClass}>Contatto preferito</label>
                  <div className="flex gap-2">
                    {CONTACT_METHODS.map((cm) => (
                      <label key={cm.value} className="cursor-pointer">
                        <input type="radio" value={cm.value} {...register('preferredContact')} className="sr-only peer" />
                        <span className="px-3 py-2 rounded-full text-footnote font-medium border transition-all flex items-center peer-checked:border-[var(--brand)] peer-checked:bg-[var(--brand)]/10 peer-checked:text-[var(--brand)] border-[var(--border-default)]/30 dark:border-[var(--border-default)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)]">
                          {cm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 3. INTAKE VEICOLO */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={Gauge} title="Accettazione Veicolo" subtitle="Km, carburante, condizioni" number={3} />
              <AppleCardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Mileage */}
                  <div>
                    <label className={labelClass}>Km ingresso *</label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <Input
                        type="number"
                        {...register('mileageIn')}
                        placeholder="es. 85.000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Parking Spot */}
                  <div>
                    <label className={labelClass}>Posto parcheggio</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <Input
                        {...register('parkingSpot')}
                        placeholder="es. A-12"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Key Tag */}
                  <div>
                    <label className={labelClass}>Etichetta chiave</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <Input
                        {...register('keyTag')}
                        placeholder="es. K-042"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Fuel Level */}
                <div>
                  <label className={labelClass}>Livello carburante</label>
                  <div className="flex gap-2">
                    {FUEL_LEVELS.map((fl) => (
                      <label key={fl.value} className="cursor-pointer flex-1">
                        <input type="radio" value={fl.value} {...register('fuelLevelIn')} className="sr-only peer" />
                        <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                          watchedFuel === fl.value
                            ? 'border-[var(--brand)] bg-[var(--brand)]/5'
                            : 'border-[var(--border-default)]/30 dark:border-[var(--border-default)] hover:bg-[var(--surface-secondary)]/20'
                        }`}>
                          <div className="w-full h-2 bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                fl.value === 'EMPTY' ? 'bg-[var(--status-error)]' : fl.value === 'QUARTER' ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-success)]'
                              }`}
                              style={{ width: fl.width }}
                            />
                          </div>
                          <span className={`text-footnote font-medium ${watchedFuel === fl.value ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'}`}>
                            {fl.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pre-existing Damage */}
                <div>
                  <label className={labelClass}>Danni preesistenti</label>
                  <textarea
                    {...register('preExistingDamage')}
                    rows={2}
                    placeholder="Graffio portiera destra, ammaccatura paraurti posteriore..."
                    className={textareaClass}
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="checkbox" {...register('testDriveBefore')} className="w-4 h-4 rounded border-[var(--border-default)] accent-apple-blue" />
                    <span className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">Test drive effettuato</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="checkbox" {...register('recallCheckDone')} className="w-4 h-4 rounded border-[var(--border-default)] accent-apple-blue" />
                    <span className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">Controllo richiami MCTC</span>
                  </label>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 4. PROBLEMA + DIAGNOSI (3C header) */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={Clipboard} title="Richiesta Cliente e Diagnosi" subtitle="Cosa riporta il cliente e la diagnosi iniziale" number={4} />
              <AppleCardContent className="space-y-4">
                <div>
                  <label className={labelClass}>Richiesta del cliente (con le sue parole)</label>
                  <textarea
                    {...register('customerRequest')}
                    rows={3}
                    placeholder="Il cliente dice: 'Sento un rumore strano quando freno e il volante vibra...'"
                    className={textareaClass}
                  />
                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">Questo testo apparirà in fattura come richiesta originale del cliente</p>
                </div>
                <div>
                  <label className={labelClass}>Diagnosi / Valutazione iniziale</label>
                  <textarea
                    {...register('diagnosis')}
                    rows={3}
                    placeholder="Pastiglie freno anteriori consumate, dischi sotto spessore minimo..."
                    className={textareaClass}
                  />
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 5. ASSEGNAZIONE + TEMPI */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={Wrench} title="Assegnazione e Tempi" subtitle="Tecnico, accettatore, postazione, scadenze" number={5} />
              <AppleCardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Service Advisor */}
                  <div>
                    <label className={labelClass}>Accettatore</label>
                    <select {...register('serviceAdvisorId')} disabled={techniciansLoading} className={selectClass}>
                      <option value="">Seleziona accettatore</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Technician */}
                  <div>
                    <label className={labelClass}>Tecnico principale</label>
                    <select {...register('technicianId')} disabled={techniciansLoading} className={selectClass}>
                      <option value="">{techniciansLoading ? 'Caricamento...' : 'Nessun tecnico assegnato'}</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bay */}
                  <div>
                    <label className={labelClass}>Postazione / Ponte</label>
                    <select {...register('assignedBayId')} className={selectClass}>
                      <option value="">Nessuna postazione</option>
                      {bays.filter((b) => b.status === 'AVAILABLE').map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Promise Time */}
                  <div>
                    <label className={labelClass}>Data/ora promessa al cliente</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <input
                        type="datetime-local"
                        {...register('estimatedCompletion')}
                        className="w-full h-10 pl-10 pr-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                      />
                    </div>
                  </div>

                  {/* Estimated Pickup */}
                  <div>
                    <label className={labelClass}>Ritiro stimato</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <input
                        type="datetime-local"
                        {...register('estimatedPickup')}
                        className="w-full h-10 pl-10 pr-3 rounded-xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                      />
                    </div>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 6. LOGISTICA CLIENTE */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={Truck} title="Logistica Cliente" subtitle="Come si muove il cliente durante la riparazione" number={6} />
              <AppleCardContent className="space-y-4">
                {/* Drop-off Type */}
                <div>
                  <label className={labelClass}>Tipo consegna</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {DROP_OFF_TYPES.map((dt) => (
                      <label key={dt.value} className="cursor-pointer">
                        <input type="radio" value={dt.value} {...register('dropOffType')} className="sr-only peer" />
                        <div className={`flex items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[44px] ${
                          watchedDropOff === dt.value
                            ? 'border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]'
                            : 'border-[var(--border-default)]/30 dark:border-[var(--border-default)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/30'
                        }`}>
                          <span className="text-footnote font-medium">{dt.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Courtesy Car */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="checkbox" {...register('courtesyCarRequested')} className="w-4 h-4 rounded border-[var(--border-default)] accent-apple-blue" />
                    <span className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">Auto sostitutiva richiesta</span>
                  </label>
                  {watchedCourtesy && (
                    <div className="flex-1">
                      <Input {...register('courtesyCarPlate')} placeholder="Targa auto sostitutiva (es. AB123CD)" />
                    </div>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 7. LAVORAZIONI (3C per riga) */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={ClipboardList} title="Lavorazioni" subtitle="Dettaglio lavori con standard 3C (Problema/Causa/Correzione)" number={7} />
              <AppleCardContent className="space-y-4">
                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <AppleButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={openCannedJobsDialog}
                    icon={<ClipboardList className="h-3.5 w-3.5" />}
                  >
                    Lavori Standard
                  </AppleButton>
                  <AppleButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => append({
                      description: '',
                      customerConcern: '',
                      cause: '',
                      correction: '',
                      estimatedHours: 0,
                      estimatedCost: 0,
                      laborRate: undefined,
                      laborType: 'FLAT_RATE',
                      opCode: '',
                      technicianId: '',
                      authorized: true,
                      isSublet: false,
                      subletVendor: '',
                      warrantyType: '',
                    })}
                    icon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Aggiungi lavorazione
                  </AppleButton>
                </div>

                {fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Wrench className="h-10 w-10 text-[var(--text-tertiary)]/30 mb-3" />
                    <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      Nessuna lavorazione aggiunta
                    </p>
                    <p className="text-footnote text-[var(--text-tertiary)]/60 dark:text-[var(--text-tertiary)] mt-1">
                      Usa &ldquo;Lavori Standard&rdquo; o &ldquo;Aggiungi&rdquo; per inserire voci
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const isExpanded = expandedLine === index;
                      const isAuthorized = watch(`lineItems.${index}.authorized`) !== false;
                      return (
                        <div
                          key={field.id}
                          className={`rounded-2xl border transition-all ${
                            !isAuthorized
                              ? 'border-[var(--status-error)]/30 bg-[var(--status-error-subtle)]/30 dark:bg-[var(--status-error)]/40/5'
                              : 'border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)]/20 dark:bg-[var(--surface-hover)]'
                          }`}
                        >
                          {/* Main Row */}
                          <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              {/* Line number */}
                              <div className="w-7 h-7 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-footnote font-bold text-[var(--brand)]">{index + 1}</span>
                              </div>

                              {/* Description + Op Code */}
                              <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    {...register(`lineItems.${index}.description`)}
                                    placeholder="Descrizione lavorazione"
                                    className="flex-1"
                                  />
                                  <Input
                                    {...register(`lineItems.${index}.opCode`)}
                                    placeholder="Cod. Op."
                                    className="w-24"
                                  />
                                </div>

                                {/* Hours, Cost, Rate row */}
                                <div className="flex flex-wrap gap-2">
                                  <div className="w-20">
                                    <label className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ore</label>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      {...register(`lineItems.${index}.estimatedHours`)}
                                      placeholder="0"
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="w-24">
                                    <label className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Tariffa/h</label>
                                    <Input
                                      type="number"
                                      {...register(`lineItems.${index}.laborRate`)}
                                      placeholder="45"
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="w-24">
                                    <label className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Ricambi EUR</label>
                                    <Input
                                      type="number"
                                      {...register(`lineItems.${index}.estimatedCost`)}
                                      placeholder="0"
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="w-28">
                                    <label className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Tipo tariffa</label>
                                    <select {...register(`lineItems.${index}.laborType`)} className="w-full h-8 px-2 rounded-lg border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-footnote text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                      {LABOR_TYPES.map((lt) => (
                                        <option key={lt.value} value={lt.value}>{lt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="w-28">
                                    <label className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Tecnico</label>
                                    <select {...register(`lineItems.${index}.technicianId`)} className="w-full h-8 px-2 rounded-lg border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-footnote text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                      <option value="">—</option>
                                      {technicians.map((t) => (
                                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName[0]}.</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setExpandedLine(isExpanded ? null : index)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-active)] transition-colors"
                                  title="Dettagli 3C"
                                >
                                  <Pen className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = watch(`lineItems.${index}.authorized`);
                                    setValue(`lineItems.${index}.authorized`, !current);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-active)] transition-colors"
                                  title={isAuthorized ? 'Segna come rifiutato' : 'Segna come autorizzato'}
                                >
                                  {isAuthorized
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--status-success)]" />
                                    : <XCircle className="h-3.5 w-3.5 text-[var(--status-error)]" />
                                  }
                                </button>
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--status-error-subtle)] dark:hover:bg-[var(--status-error)]/40/10 transition-colors"
                                  title="Rimuovi"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--text-tertiary)] hover:text-[var(--status-error)]" />
                                </button>
                              </div>
                            </div>

                            {/* Authorization badge */}
                            {!isAuthorized && (
                              <div className="flex items-center gap-1.5 ml-10">
                                <XCircle className="h-3.5 w-3.5 text-[var(--status-error)]" />
                                <span className="text-footnote font-medium text-[var(--status-error)]">Rifiutato dal cliente</span>
                              </div>
                            )}
                          </div>

                          {/* Expanded 3C Details */}
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] p-4 space-y-3 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]/50 rounded-b-2xl"
                            >
                              <p className="text-footnote font-semibold text-[var(--brand)] flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Standard 3C — Problema / Causa / Correzione
                              </p>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                                    1. Problema (parole del cliente)
                                  </label>
                                  <textarea
                                    {...register(`lineItems.${index}.customerConcern`)}
                                    rows={2}
                                    placeholder="Es: 'Sento un rumore metallico quando freno'"
                                    className={textareaClass}
                                  />
                                </div>
                                <div>
                                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                                    2. Causa (diagnosi tecnica)
                                  </label>
                                  <textarea
                                    {...register(`lineItems.${index}.cause`)}
                                    rows={2}
                                    placeholder="Es: 'Pastiglie freno anteriori sotto spessore minimo, disco rigato'"
                                    className={textareaClass}
                                  />
                                </div>
                                <div>
                                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">
                                    3. Correzione (lavoro eseguito)
                                  </label>
                                  <textarea
                                    {...register(`lineItems.${index}.correction`)}
                                    rows={2}
                                    placeholder="Es: 'Sostituzione pastiglie e dischi freno anteriori, coppia di serraggio a specifica'"
                                    className={textareaClass}
                                  />
                                </div>
                              </div>

                              {/* Warranty + Sublet */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                  <label className="text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 block">Garanzia</label>
                                  <select {...register(`lineItems.${index}.warrantyType`)} className={selectClass}>
                                    {WARRANTY_TYPES.map((wt) => (
                                      <option key={wt.value} value={wt.value}>{wt.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                    <input type="checkbox" {...register(`lineItems.${index}.isSublet`)} className="w-4 h-4 rounded border-[var(--border-default)] accent-apple-blue" />
                                    <span className="text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">Lavoro in subfornitura</span>
                                  </label>
                                  {watch(`lineItems.${index}.isSublet`) && (
                                    <Input
                                      {...register(`lineItems.${index}.subletVendor`)}
                                      placeholder="Nome fornitore esterno"
                                      className="mt-1"
                                    />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Live Total */}
                {watchedLineItems.length > 0 && (
                  <LiveTotal lineItems={watchedLineItems} />
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* 8. NOTE + FINANZIARIO */}
          {/* ============================================================= */}
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <SectionHeader icon={Pen} title="Note e Dettagli Finanziari" number={8} />
              <AppleCardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Note interne (solo officina)</label>
                    <textarea
                      {...register('internalNotes')}
                      rows={3}
                      placeholder="Note visibili solo al team interno..."
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Note per il cliente (in fattura)</label>
                    <textarea
                      {...register('customerVisibleNotes')}
                      rows={3}
                      placeholder="Note che saranno visibili al cliente..."
                      className={textareaClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Pre-auth Amount */}
                  <div>
                    <label className={labelClass}>Importo pre-autorizzato</label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <Input
                        type="number"
                        step="0.01"
                        {...register('preAuthAmount')}
                        placeholder="Max spesa senza chiamare"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-footnote text-[var(--text-tertiary)]/60 dark:text-[var(--text-tertiary)] mt-1">Spesa max prima di contattare il cliente</p>
                  </div>

                  {/* Tax Exempt */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px] mb-1.5">
                      <input type="checkbox" {...register('taxExempt')} className="w-4 h-4 rounded border-[var(--border-default)] accent-apple-blue" />
                      <span className={labelClass + ' !mb-0'}>Esenzione IVA</span>
                    </label>
                    {watchedTaxExempt && (
                      <Input
                        {...register('taxExemptCert')}
                        placeholder="N. certificato esenzione"
                      />
                    )}
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* ============================================================= */}
          {/* SUBMIT (mobile) */}
          {/* ============================================================= */}
          <div className="flex items-center justify-between pt-2 pb-8 sm:hidden">
            <AppleButton
              type="button"
              variant="ghost"
              onClick={() => router.push('/dashboard/work-orders')}
            >
              Annulla
            </AppleButton>
            <AppleButton
              type="submit"
              loading={isSubmitting}
              icon={<Save className="h-4 w-4" />}
            >
              Crea OdL
            </AppleButton>
          </div>
        </form>
      </motion.div>

      {/* ================================================================= */}
      {/* Canned Jobs Dialog */}
      {/* ================================================================= */}
      <Dialog open={cannedJobsDialogOpen} onOpenChange={setCannedJobsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Lavori Standard</DialogTitle>
            <DialogDescription>
              Seleziona un lavoro standard per aggiungerlo all&apos;ordine di lavoro.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 mt-2">
            {cannedJobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
              </div>
            ) : cannedJobs.length === 0 ? (
              <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-center py-8">
                Nessun lavoro standard configurato.
              </p>
            ) : (
              cannedJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => addCannedJob(job)}
                  className="w-full text-left p-3 rounded-2xl border border-[var(--border-default)]/30 dark:border-[var(--border-default)] hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-active)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{job.name}</p>
                    {job.opCode && <span className="text-footnote font-mono text-[var(--text-tertiary)]">{job.opCode}</span>}
                  </div>
                  {job.description && (
                    <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-0.5">{job.description}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {job.estimatedHours != null && (
                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{job.estimatedHours} ore</span>
                    )}
                    {job.estimatedCost != null && (
                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{job.estimatedCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
