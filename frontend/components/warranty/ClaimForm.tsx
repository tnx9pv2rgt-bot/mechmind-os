'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText, X, Send } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const claimFormSchema = z.object({
  issueDescription: z
    .string()
    .min(10, 'La descrizione deve avere almeno 10 caratteri')
    .max(5000, 'La descrizione non pu\u00F2 superare i 5000 caratteri'),
  estimatedCost: z.coerce.number().min(0.01, 'Il costo stimato deve essere maggiore di 0'),
  evidence: z.array(z.string().url()).default([]),
});

type ClaimFormValues = z.infer<typeof claimFormSchema>;

interface ClaimFormProps {
  warrantyId: string;
  maxClaimAmount?: number;
  deductible?: number;
  onSubmit: (data: ClaimFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ClaimForm({
  warrantyId,
  maxClaimAmount,
  deductible = 0,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClaimFormProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      issueDescription: '',
      estimatedCost: 0,
      evidence: [],
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      // Simulate file upload - in production, this would upload to a storage service
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        // In production, upload to your storage service here
        // const url = await uploadToStorage(file)
        const objectUrl = URL.createObjectURL(file);
        newUrls.push(objectUrl);
      }

      setUploadedFiles(prev => [...prev, ...newUrls]);
      form.setValue('evidence', [...uploadedFiles, ...newUrls]);

      toast({
        title: 'File caricati',
        description: `${files.length} file caricati con successo`,
      });
    } catch (error) {
      toast({
        title: 'Caricamento fallito',
        description: error instanceof Error ? error.message : 'Impossibile caricare i file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    form.setValue('evidence', newFiles);
  };

  const handleSubmit = (data: ClaimFormValues) => {
    // Check if claim amount exceeds max coverage
    if (maxClaimAmount && data.estimatedCost > maxClaimAmount) {
      toast({
        title: 'Importo supera la copertura',
        description: `Importo massimo reclamo: €${maxClaimAmount.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    onSubmit(data);
  };

  const estimatedCost = form.watch('estimatedCost');
  const netAmount = estimatedCost > 0 ? Math.max(0, estimatedCost - deductible) : 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
        {/* Issue Description */}
        <FormField
          control={form.control}
          name='issueDescription'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione Problema</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Descrivi il problema in dettaglio. Includi sintomi, quando &egrave; iniziato e informazioni rilevanti...'
                  className='min-h-[120px]'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Fornisci una descrizione dettagliata del problema per la revisione
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Estimated Cost */}
        <FormField
          control={form.control}
          name='estimatedCost'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo Riparazione Stimato (€)</FormLabel>
              <FormControl>
                <Input type='number' min={0} step='0.01' placeholder='0.00' {...field} />
              </FormControl>
              {maxClaimAmount && (
                <FormDescription>
                  Importo massimo reclamo: €{maxClaimAmount.toFixed(2)}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Deductible Info */}
        {deductible > 0 && estimatedCost > 0 && (
          <div className='bg-[#383838] border border-[#4e4e4e] rounded-2xl p-4 space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-[#888]'>Costo Stimato:</span>
              <span className='font-medium text-white'>€{estimatedCost.toFixed(2)}</span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-[#888]'>Franchigia:</span>
              <span className='font-medium text-amber-400'>-€{deductible.toFixed(2)}</span>
            </div>
            <div className='border-t border-[#4e4e4e] pt-2 flex items-center justify-between'>
              <span className='font-medium text-white'>Importo Netto:</span>
              <span className='font-semibold text-green-400'>€{netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Evidence Upload */}
        <FormField
          control={form.control}
          name='evidence'
          render={() => (
            <FormItem>
              <FormLabel>Prove Fotografiche</FormLabel>
              <FormControl>
                <div className='space-y-4'>
                  {/* Upload Area */}
                  <div className='border-2 border-dashed border-[#4e4e4e] rounded-2xl p-6 text-center hover:border-[#888] transition-colors'>
                    <Upload className='mx-auto h-8 w-8 text-[#888] mb-2' />
                    <p className='text-sm text-[#888] mb-2'>
                      Carica foto del danno o del problema
                    </p>
                    <p className='text-xs text-[#888] mb-3'>Formati supportati: JPG, PNG, HEIC</p>
                    <Input
                      type='file'
                      accept='image/*'
                      multiple
                      className='hidden'
                      id='evidence-upload'
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={isUploading}
                      onClick={() => document.getElementById('evidence-upload')?.click()}
                      className='rounded-full border-[#4e4e4e] bg-transparent text-white hover:bg-white/5'
                    >
                      {isUploading ? 'Caricamento...' : 'Seleziona File'}
                    </Button>
                  </div>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className='space-y-2'>
                      <p className='text-sm font-medium text-white'>
                        {uploadedFiles.length} file caricati
                      </p>
                      <div className='grid grid-cols-2 gap-2'>
                        {uploadedFiles.map((url, index) => (
                          <div
                            key={index}
                            className='relative group aspect-video rounded-2xl overflow-hidden bg-[#383838]'
                          >
                            <img
                              src={url}
                              alt={`Prova ${index + 1}`}
                              className='w-full h-full object-cover'
                            />
                            <button
                              type='button'
                              onClick={() => removeFile(index)}
                              className='absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                            >
                              <X className='h-3 w-3' />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Carica foto chiare che mostrano il problema per una elaborazione pi&ugrave; rapida
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className='flex items-center justify-end gap-3 pt-4 border-t border-[#4e4e4e]'>
          {onCancel && (
            <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading} className='rounded-full h-[52px] border-[#4e4e4e] bg-transparent text-white hover:bg-white/5'>
              Annulla
            </Button>
          )}
          <Button type='submit' disabled={isLoading || isUploading} className='rounded-full h-[52px] bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]'>
            <Send className='h-4 w-4 mr-2' />
            {isLoading ? 'Invio...' : 'Invia Reclamo'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ClaimForm;
