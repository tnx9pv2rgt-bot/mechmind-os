'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AppleButton } from '@/components/ui/apple-button'
import { CustomerForm } from './customer-form'
import { CustomerFormData } from './customer-form-schema'
import { cn } from '@/lib/utils'

interface CustomerDialogProps {
  onSuccess?: (customer: CustomerFormData) => void
  trigger?: React.ReactNode
  className?: string
}

/**
 * Apple Design 2026 - Customer Dialog
 * Modal with Liquid Glass effect for creating new customers
 */
export function CustomerDialog({ 
  onSuccess, 
  trigger,
  className 
}: CustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: CustomerFormData) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('New customer:', data)
      onSuccess?.(data)
      setOpen(false)
    } catch (error) {
      console.error('Error creating customer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <AppleButton 
            variant="primary" 
            icon={<Plus className="h-4 w-4" />}
            className={className}
          >
            Nuovo Cliente
          </AppleButton>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className={cn(
          "max-w-2xl max-h-[90vh] overflow-y-auto p-0",
          "border-0 bg-white/80 dark:bg-gray-900/90",
          "backdrop-blur-2xl shadow-apple-xl",
          "rounded-[28px]"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Nuovo Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 md:p-8">
          <CustomerForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Inline trigger variant - for use in tables/lists
export function CustomerDialogInline({ 
  onSuccess,
  children 
}: { 
  onSuccess?: (customer: CustomerFormData) => void
  children: React.ReactNode 
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: CustomerFormData) => {
    setIsLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSuccess?.(data)
      setOpen(false)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent 
        className={cn(
          "max-w-2xl max-h-[90vh] overflow-y-auto p-0",
          "border-0 bg-white/80 dark:bg-gray-900/90",
          "backdrop-blur-2xl shadow-apple-xl",
          "rounded-[28px]"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Nuovo Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 md:p-8">
          <CustomerForm
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Success Toast Component
export function CustomerSuccessToast({ 
  customer,
  onClose 
}: { 
  customer: CustomerFormData
  onClose?: () => void 
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className={cn(
        "flex items-center gap-4 rounded-2xl p-4 pr-6",
        "bg-white/90 dark:bg-gray-900/90",
        "backdrop-blur-xl shadow-apple-xl",
        "border border-green-200 dark:border-green-800"
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            Cliente creato!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {customer.nome} {customer.cognome} è stato aggiunto
          </p>
        </div>
        <button 
          onClick={onClose}
          className="ml-2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
