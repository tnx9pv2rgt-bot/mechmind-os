// ✅ Pagina form corretta — Pattern MechMind OS
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Zod schema con messaggi in italiano
const formSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ExampleFormPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Errore nella creazione');
      }

      toast.success('Elemento creato con successo');
      router.push('/dashboard/examples');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Errore nella creazione'
      );
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto dark:bg-[#1c1c1e] min-h-screen">
      <h1 className="text-2xl font-bold mb-6 dark:text-[#ececec]">
        Nuovo elemento
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#ececec]">
            Nome *
          </label>
          <input
            {...register('name')}
            className="w-full px-4 py-2 border rounded-lg dark:bg-[#2f2f2f] dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#ececec]">
            Email *
          </label>
          <input
            type="email"
            {...register('email')}
            className="w-full px-4 py-2 border rounded-lg dark:bg-[#2f2f2f] dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#ececec]">
            Telefono
          </label>
          <input
            type="tel"
            {...register('phone')}
            className="w-full px-4 py-2 border rounded-lg dark:bg-[#2f2f2f] dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#ececec]">
            Note
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg dark:bg-[#2f2f2f] dark:border-[#424242] dark:text-[#ececec]"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Salvataggio...' : 'Crea elemento'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
