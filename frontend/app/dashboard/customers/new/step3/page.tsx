'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Plus, 
  Trash2, 
  Loader2, 
  Fuel, 
  Settings, 
  Gauge, 
  Zap, 
  Palette, 
  Calendar,
  Scale,
  Armchair,
  Ruler,
  FileText,
  Tag,
  Wind,
  Info
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const vehicleSchema = z.object({
  // Dati principali - TUTTO FACOLTATIVO
  plate: z.string().optional().or(z.literal('')),
  make: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  variant: z.string().optional().or(z.literal('')),
  year: z.number().optional().or(z.nan()),
  km: z.number().optional().or(z.nan()),
  vin: z.string().optional().or(z.literal('')),
  
  // Tipologia - FACOLTATIVO
  vehicleType: z.enum(['auto', 'moto', 'furgone', 'camion', 'rimorchio', 'altro']).optional(),
  
  // Carburante e motorizzazione - FACOLTATIVO
  fuel: z.enum(['benzina', 'diesel', 'gpl', 'metano', 'elettrico', 'ibrido', 'hybrid_plug_in']).optional(),
  displacement: z.number().optional().or(z.nan()),
  powerKw: z.number().optional().or(z.nan()),
  powerCv: z.number().optional().or(z.nan()),
  
  // Emissioni - FACOLTATIVO
  euroClass: z.string().optional().or(z.literal('')),
  co2: z.number().optional().or(z.nan()),
  
  // Omologazione - FACOLTATIVO
  natscode: z.string().optional().or(z.literal('')),
  ncte: z.string().optional().or(z.literal('')),
  
  // Aspetto - FACOLTATIVO
  color: z.string().optional().or(z.literal('')),
  doors: z.number().optional().or(z.nan()),
  seats: z.number().optional().or(z.nan()),
  
  // Date - FACOLTATIVO
  registrationDate: z.string().optional().or(z.literal('')),
  inspectionExpiry: z.string().optional().or(z.literal('')),
  
  // Pneumatici - FACOLTATIVO
  tiresFront: z.string().optional().or(z.literal('')),
  tiresRear: z.string().optional().or(z.literal('')),
  
  // Masse - FACOLTATIVO
  massOwn: z.number().optional().or(z.nan()),
  massMax: z.number().optional().or(z.nan()),
  massTrailer: z.number().optional().or(z.nan()),
  
  // Dimensioni - FACOLTATIVO
  length: z.number().optional().or(z.nan()),
  width: z.number().optional().or(z.nan()),
  height: z.number().optional().or(z.nan()),
  
  // Note - FACOLTATIVO
  notes: z.string().optional().or(z.literal('')),
});

const schema = z.object({
  vehicles: z.array(vehicleSchema),
});

type FormData = z.infer<typeof schema>;

const fuelTypes = [
  { value: 'benzina', label: 'Benzina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
  { value: 'metano', label: 'Metano' },
  { value: 'elettrico', label: 'Elettrico' },
  { value: 'ibrido', label: 'Ibrido' },
  { value: 'hybrid_plug_in', label: 'Hybrid Plug-in' },
];

const vehicleTypes = [
  { value: 'auto', label: 'Automobile' },
  { value: 'moto', label: 'Motociclo' },
  { value: 'furgone', label: 'Furgone' },
  { value: 'camion', label: 'Camion' },
  { value: 'rimorchio', label: 'Rimorchio' },
  { value: 'altro', label: 'Altro' },
];

const euroClasses = [
  { value: 'Euro 1', label: 'Euro 1' },
  { value: 'Euro 2', label: 'Euro 2' },
  { value: 'Euro 3', label: 'Euro 3' },
  { value: 'Euro 4', label: 'Euro 4' },
  { value: 'Euro 5', label: 'Euro 5' },
  { value: 'Euro 6', label: 'Euro 6' },
  { value: 'Euro 6d', label: 'Euro 6d' },
  { value: 'Non classificato', label: 'Non classificato' },
];

export default function Step3Page() {
  const router = useRouter();
  const { formData: savedData, saveStep, isLoaded } = useFormSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      vehicles: [{ 
        plate: '', 
        make: '', 
        model: '', 
        vehicleType: undefined,
        year: undefined, 
        km: undefined, 
        fuel: undefined,
        displacement: undefined,
        powerKw: undefined,
        powerCv: undefined,
        euroClass: '',
        co2: undefined,
        natscode: '',
        ncte: '',
        color: '',
        doors: undefined,
        seats: undefined,
        registrationDate: '',
        inspectionExpiry: '',
        tiresFront: '',
        tiresRear: '',
        massOwn: undefined,
        massMax: undefined,
        massTrailer: undefined,
        length: undefined,
        width: undefined,
        height: undefined,
        notes: '',
      }],
    },
  });

  // Debug: log errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', errors);
    }
  }, [errors]);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'vehicles',
  });

  // Ripristina i veicoli salvati quando si torna indietro
  useEffect(() => {
    if (isLoaded && savedData?.vehicles && savedData.vehicles.length > 0) {
      replace(savedData.vehicles);
    }
  }, [isLoaded, savedData, replace]);



  const handleBack = () => {
    router.push('/dashboard/customers/new/step2');
  };

  // Wrapper sicuro per la navigazione Avanti
  const handleNext = () => {
    console.log('=== handleNext CLICKED ===');
    setIsSubmitting(true);
    
    try {
      // Prendi i dati attuali dal form
      const data = watch();
      console.log('Form data:', data);
      
      // Salva i dati
      saveStep(3, data);
      
      // Naviga immediatamente - metodo sicuro
      const nextUrl = '/dashboard/customers/new/step4';
      console.log('Navigating to:', nextUrl);
      
      // Usa window.location per navigazione sicura
      if (typeof window !== 'undefined') {
        window.location.href = nextUrl;
      }
    } catch (err) {
      console.error('Error:', err);
      // Fallback assoluto
      window.location.href = '/dashboard/customers/new/step4';
    }
  };

  const addVehicle = () => {
    append({ 
      plate: '', 
      make: '', 
      model: '', 
      vehicleType: undefined,
      year: undefined, 
      km: undefined, 
      fuel: undefined,
    });
  };

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <FormLayout 
      step={3} 
      title="Veicoli" 
      subtitle="Dati completi del libretto di circolazione"
      onBack={handleBack}
      onNext={handleNext}
      isSubmitting={isSubmitting}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Section Header with Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Parco Veicoli</h2>
            <p className="text-gray-500 text-sm">Inserisci tutti i dati del libretto</p>
          </div>
        </div>

        <AnimatePresence>
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6"
            >
              {/* Header Veicolo */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 text-lg">Veicolo {index + 1}</span>
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Rimuovi
                  </Button>
                )}
              </div>

              {/* === SEZIONE 1: DATI PRINCIPALI === */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Dati Principali</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Targa */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Targa</Label>
                    <Input
                      {...register(`vehicles.${index}.plate`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
                      placeholder="AB123CD"
                      maxLength={10}
                    />
                  </div>

                  {/* Tipologia */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipologia</Label>
                    <Select 
                      value={watch(`vehicles.${index}.vehicleType`) || 'none'}
                      onValueChange={(v) => setValue(`vehicles.${index}.vehicleType`, v === 'none' ? undefined : v as FormData['vehicles'][number]['vehicleType'])}
                    >
                      <SelectTrigger className="h-14 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">- Nessuna selezione -</SelectItem>
                        {vehicleTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Marca */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Marca</Label>
                    <Input
                      {...register(`vehicles.${index}.make`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Fiat"
                    />
                  </div>

                  {/* Modello */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Modello</Label>
                    <Input
                      {...register(`vehicles.${index}.model`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Panda"
                    />
                  </div>

                  {/* Versione/Variante */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Versione</Label>
                    <Input
                      {...register(`vehicles.${index}.variant`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="1.0 Lounge"
                    />
                  </div>

                  {/* VIN */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">VIN / Telaio</Label>
                    <Input
                      {...register(`vehicles.${index}.vin`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
                      placeholder="ZFA31200000012345"
                      maxLength={17}
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 2: MOTORIZZAZIONE === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Motorizzazione</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Carburante */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Carburante</Label>
                    <Select 
                      value={watch(`vehicles.${index}.fuel`) || 'none'}
                      onValueChange={(v) => setValue(`vehicles.${index}.fuel`, v === 'none' ? undefined : v as FormData['vehicles'][number]['fuel'])}
                    >
                      <SelectTrigger className="h-14 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">- Nessuna selezione -</SelectItem>
                        {fuelTypes.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cilindrata */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Cilindrata (cc)</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.displacement`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="999"
                    />
                  </div>

                  {/* Potenza kW */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Potenza (kW)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      {...register(`vehicles.${index}.powerKw`, { 
                        valueAsNumber: true,
                        onChange: (e) => {
                          const kw = parseFloat(e.target.value);
                          if (!isNaN(kw) && kw > 0) {
                            const cv = Math.round(kw / 0.735 * 10) / 10;
                            setValue(`vehicles.${index}.powerCv`, cv);
                          }
                        }
                      })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="51"
                    />
                  </div>

                  {/* Potenza CV */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Potenza (CV)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      {...register(`vehicles.${index}.powerCv`, { 
                        valueAsNumber: true,
                        onChange: (e) => {
                          const cv = parseFloat(e.target.value);
                          if (!isNaN(cv) && cv > 0) {
                            const kw = Math.round(cv * 0.735 * 10) / 10;
                            setValue(`vehicles.${index}.powerKw`, kw);
                          }
                        }
                      })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="69"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 3: EMISSIONI === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Wind className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Emissioni</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Classe Euro */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Classe Euro</Label>
                    <Select 
                      value={watch(`vehicles.${index}.euroClass`) || 'none'}
                      onValueChange={(v) => setValue(`vehicles.${index}.euroClass`, v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="h-14 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">- Nessuna selezione -</SelectItem>
                        {euroClasses.map(e => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CO2 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">CO₂ (g/km)</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.co2`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="105"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 4: OMOLOGAZIONE === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Omologazione</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* NATS */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Codice NATS</Label>
                    <Input
                      {...register(`vehicles.${index}.natscode`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
                      placeholder="e1*2001/116*0035*01"
                    />
                  </div>

                  {/* NCTE */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">NCTE</Label>
                    <Input
                      {...register(`vehicles.${index}.ncte`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
                      placeholder="N1234AB"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 5: DATI AMMINISTRATIVI === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Dati Amministrativi</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Data immatricolazione */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Data Immatricolazione</Label>
                    <Input
                      type="date"
                      {...register(`vehicles.${index}.registrationDate`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Anno */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Anno</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.year`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="2020"
                    />
                  </div>

                  {/* KM */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">KM attuali</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.km`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="50000"
                    />
                  </div>

                  {/* Scadenza revisione */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Scadenza Revisione</Label>
                    <Input
                      type="date"
                      {...register(`vehicles.${index}.inspectionExpiry`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 6: ASPETTO === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Aspetto</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Colore */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Colore</Label>
                    <Input
                      {...register(`vehicles.${index}.color`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Bianco"
                    />
                  </div>

                  {/* Porte */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Porte</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.doors`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="5"
                      min={1}
                      max={9}
                    />
                  </div>

                  {/* Posti */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Posti</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.seats`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="5"
                      min={1}
                      max={50}
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 7: PNEUMATICI === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Gauge className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Pneumatici</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Anteriori */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Anteriori</Label>
                    <Input
                      {...register(`vehicles.${index}.tiresFront`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="195/55 R16"
                    />
                  </div>

                  {/* Posteriori */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Posteriori</Label>
                    <Input
                      {...register(`vehicles.${index}.tiresRear`)}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="195/55 R16"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 8: MASSE === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Masse (kg)</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Massa a vuoto */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Massa a Vuoto</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.massOwn`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="1050"
                    />
                  </div>

                  {/* Massa max */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Massa Complessiva</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.massMax`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="1600"
                    />
                  </div>

                  {/* Massa rimorchiabile */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Rimorchiabile</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.massTrailer`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="800"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 9: DIMENSIONI === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Ruler className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Dimensioni (mm)</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Lunghezza */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Lunghezza</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.length`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="3685"
                    />
                  </div>

                  {/* Larghezza */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Larghezza</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.width`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="1645"
                    />
                  </div>

                  {/* Altezza */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Altezza</Label>
                    <Input
                      type="number"
                      {...register(`vehicles.${index}.height`, { valueAsNumber: true })}
                      className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="1550"
                    />
                  </div>
                </div>
              </div>

              {/* === SEZIONE 10: NOTE === */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Note</h3>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Note aggiuntive</Label>
                  <textarea
                    {...register(`vehicles.${index}.notes`)}
                    className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                    placeholder="Inserisci eventuali note, accessori, modifiche..."
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Aggiungi veicolo */}
        <Button
          type="button"
          variant="outline"
          onClick={addVehicle}
          className="w-full h-14 border-2 border-dashed border-blue-300 rounded-2xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Aggiungi altro veicolo
        </Button>

        {errors.vehicles && (
          <p className="text-red-500 text-sm text-center">{errors.vehicles.message}</p>
        )}
      </motion.div>
    </FormLayout>
  );
}
