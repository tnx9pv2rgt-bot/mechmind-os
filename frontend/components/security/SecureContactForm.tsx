'use client';

import React, { useState, useEffect } from 'react';
import { useCSRF, useFormProtection, useSecureFetch, HoneypotField } from '@/lib/security/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface SecureContactFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function SecureContactForm({ onSuccess, className }: SecureContactFormProps) {
  // Security hooks
  const { token, getHeaders, loading: csrfLoading } = useCSRF();
  const {
    execute,
    loading: submitLoading,
    error: submitError,
  } = useSecureFetch<{ success?: boolean }>();
  const { honeypotName, startProtection, validateProtection, getProtectionData } =
    useFormProtection({
      minFillTime: 3000,
      enableHoneypot: true,
      recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Start protection when form mounts
  useEffect(() => {
    startProtection();
  }, [startProtection]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSubmitSuccess(false);

    // Client-side validation
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.message.trim()) errors.push('Message is required');

    // Security validation
    const protectionValidation = validateProtection();
    if (!protectionValidation.valid) {
      errors.push(...protectionValidation.errors);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Get protection data
    const protectionData = getProtectionData();

    // Submit with security headers
    const result = await execute('/api/contact', {
      method: 'POST',
      headers: {
        ...getHeaders(),
      },
      body: JSON.stringify({
        ...formData,
        ...protectionData,
      }),
    });

    if (result?.success) {
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      onSuccess?.();

      // Restart protection for next submission
      startProtection();
    }
  };

  const isLoading = csrfLoading || submitLoading;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Honeypot field - hidden from real users */}
      <HoneypotField name={honeypotName} label='Leave this field empty' />

      {/* Security badge */}
      <div className='flex items-center gap-2 text-xs text-muted-foreground mb-4'>
        <Shield className='w-4 h-4' />
        <span>Protected by enterprise-grade security</span>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            <ul className='list-disc list-inside'>
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Submit error */}
      {submitError && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>{submitError.message}</AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {submitSuccess && (
        <Alert className='bg-green-50 border-green-200'>
          <CheckCircle className='h-4 w-4 text-green-600' />
          <AlertDescription className='text-green-800'>
            Message sent successfully! We&apos;ll get back to you soon.
          </AlertDescription>
        </Alert>
      )}

      {/* Form fields */}
      <div className='space-y-2'>
        <Label htmlFor='name'>Name *</Label>
        <Input
          id='name'
          name='name'
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          placeholder='Your name'
          maxLength={100}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='email'>Email *</Label>
        <Input
          id='email'
          name='email'
          type='email'
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          placeholder='your@email.com'
          maxLength={254}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='subject'>Subject</Label>
        <Input
          id='subject'
          name='subject'
          value={formData.subject}
          onChange={handleChange}
          disabled={isLoading}
          placeholder='Message subject'
          maxLength={200}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='message'>Message *</Label>
        <Textarea
          id='message'
          name='message'
          value={formData.message}
          onChange={handleChange}
          disabled={isLoading}
          placeholder='Your message...'
          rows={5}
          maxLength={5000}
        />
        <p className='text-xs text-muted-foreground'>{formData.message.length} / 5000 characters</p>
      </div>

      {/* Submit button */}
      <Button type='submit' disabled={isLoading || !token} className='w-full'>
        {isLoading ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </Button>

      {/* reCAPTCHA badge notice */}
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <p className='text-xs text-muted-foreground text-center'>
          This site is protected by reCAPTCHA and the Google{' '}
          <a href='https://policies.google.com/privacy' className='underline'>
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href='https://policies.google.com/terms' className='underline'>
            Terms of Service
          </a>{' '}
          apply.
        </p>
      )}
    </form>
  );
}
