/**
 * Esempio di integrazione AI Proactive Suggestions in un form
 * Mostra come usare useProactiveAI e ProactiveSuggestions component
 */

'use client';

import React, { useState } from 'react';
import { ProactiveSuggestions } from './ProactiveSuggestions';
import { useProactiveAI } from '@/hooks/useProactiveAI';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FormData {
  email: string;
  pec: string;
  vatNumber: string;
  companyName: string;
  ragioneSociale: string;
  address: string;
  city: string;
  cap: string;
  province: string;
  password: string;
  phone: string;
  codiceFiscale: string;
  industry: string;
  companyType: string;
}

const initialFormData: FormData = {
  email: '',
  pec: '',
  vatNumber: '',
  companyName: '',
  ragioneSociale: '',
  address: '',
  city: '',
  cap: '',
  province: '',
  password: '',
  phone: '',
  codiceFiscale: '',
  industry: '',
  companyType: '',
};

export const ProactiveFormExample: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentField, setCurrentField] = useState<string>('');

  // Funzione per riempire un campo
  const fillField = (field: string, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Hook AI proattiva
  const { suggestions, dismissSuggestion, dismissAll, isLoading, count } = useProactiveAI({
    formData,
    currentField,
    fillField,
    onSuggestionGenerated: _s => {
      // Suggestion generated
    },
  });

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleFocus = (field: string) => () => {
    setCurrentField(field);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className='max-w-2xl mx-auto p-6'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold mb-2'>Registrazione Azienda</h2>
        <p className='text-gray-600'>
          Compila il form. L&apos;AI ti suggerirà automaticamente correzioni e ottimizzazioni.
        </p>
        {count > 0 && (
          <p className='text-sm text-blue-600 mt-2'>
            {count} suggeriment{count === 1 ? 'o' : 'i'} disponibili
          </p>
        )}
      </div>

      {/* AI Suggestions Panel */}
      <div className='mb-6'>
        <ProactiveSuggestions
          suggestions={suggestions}
          onDismiss={dismissSuggestion}
          maxSuggestions={3}
        />

        {isLoading && (
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
            Analizzando i dati...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Email */}
        <div>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            value={formData.email}
            onChange={handleChange('email')}
            onFocus={handleFocus('email')}
            placeholder='esempio@gmail.com'
          />
        </div>

        {/* PEC (auto-fillabile dall'AI) */}
        <div>
          <Label htmlFor='pec'>PEC (Posta Elettronica Certificata)</Label>
          <Input
            id='pec'
            type='email'
            value={formData.pec}
            onChange={handleChange('pec')}
            onFocus={handleFocus('pec')}
            placeholder='esempio@pec.it'
          />
        </div>

        {/* Partita IVA */}
        <div>
          <Label htmlFor='vatNumber'>Partita IVA</Label>
          <Input
            id='vatNumber'
            value={formData.vatNumber}
            onChange={handleChange('vatNumber')}
            onFocus={handleFocus('vatNumber')}
            placeholder='12345678901'
            maxLength={11}
          />
        </div>

        {/* Ragione Sociale */}
        <div>
          <Label htmlFor='ragioneSociale'>Ragione Sociale</Label>
          <Input
            id='ragioneSociale'
            value={formData.ragioneSociale}
            onChange={handleChange('ragioneSociale')}
            onFocus={handleFocus('ragioneSociale')}
            placeholder='Rossi Auto SRL'
          />
        </div>

        {/* Indirizzo */}
        <div>
          <Label htmlFor='address'>Indirizzo</Label>
          <Input
            id='address'
            value={formData.address}
            onChange={handleChange('address')}
            onFocus={handleFocus('address')}
            placeholder='Via Roma 123'
          />
        </div>

        {/* Città e CAP */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <Label htmlFor='city'>Città</Label>
            <Input
              id='city'
              value={formData.city}
              onChange={handleChange('city')}
              onFocus={handleFocus('city')}
              placeholder='Milano'
            />
          </div>
          <div>
            <Label htmlFor='cap'>CAP</Label>
            <Input
              id='cap'
              value={formData.cap}
              onChange={handleChange('cap')}
              onFocus={handleFocus('cap')}
              placeholder='20100'
              maxLength={5}
            />
          </div>
        </div>

        {/* Provincia */}
        <div>
          <Label htmlFor='province'>Provincia</Label>
          <Input
            id='province'
            value={formData.province}
            onChange={handleChange('province')}
            onFocus={handleFocus('province')}
            placeholder='MI'
            maxLength={2}
          />
        </div>

        {/* Telefono */}
        <div>
          <Label htmlFor='phone'>Telefono</Label>
          <Input
            id='phone'
            type='tel'
            value={formData.phone}
            onChange={handleChange('phone')}
            onFocus={handleFocus('phone')}
            placeholder='+39 123 456 7890'
          />
        </div>

        {/* Codice Fiscale */}
        <div>
          <Label htmlFor='codiceFiscale'>Codice Fiscale</Label>
          <Input
            id='codiceFiscale'
            value={formData.codiceFiscale}
            onChange={handleChange('codiceFiscale')}
            onFocus={handleFocus('codiceFiscale')}
            placeholder='RSSMRA85T10A562S'
            maxLength={16}
          />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            value={formData.password}
            onChange={handleChange('password')}
            onFocus={handleFocus('password')}
            placeholder='••••••••'
          />
        </div>

        {/* Tipo Azienda */}
        <div>
          <Label htmlFor='companyType'>Tipo Azienda</Label>
          <Input
            id='companyType'
            value={formData.companyType}
            onChange={handleChange('companyType')}
            onFocus={handleFocus('companyType')}
            placeholder='SRL, SPA, SAS...'
          />
        </div>

        {/* Settore */}
        <div>
          <Label htmlFor='industry'>Settore</Label>
          <Input
            id='industry'
            value={formData.industry}
            onChange={handleChange('industry')}
            onFocus={handleFocus('industry')}
            placeholder='Automotive, Tecnologia...'
          />
        </div>

        {/* Actions */}
        <div className='flex gap-3 pt-4'>
          <Button type='submit' className='flex-1'>
            Registra Azienda
          </Button>
          {suggestions.length > 0 && (
            <Button type='button' variant='outline' onClick={dismissAll}>
              Ignora tutti
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProactiveFormExample;
