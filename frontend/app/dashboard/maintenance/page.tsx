'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverdueAlert } from '@/components/maintenance/OverdueAlert'
import { MaintenanceList } from '@/components/maintenance/MaintenanceList'
import { MaintenanceCalendar } from '@/components/maintenance/MaintenanceCalendar'
import { MaintenanceForm } from '@/components/maintenance/MaintenanceForm'
import { MaintenanceWidget } from '@/components/maintenance/MaintenanceWidget'
import { Plus, List, Calendar, LayoutDashboard } from 'lucide-react'
import type { MaintenanceScheduleWithVehicle } from '@/lib/services/maintenanceService'

export default function MaintenancePage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceScheduleWithVehicle | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'complete'>('create')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleCreate = () => {
    setSelectedSchedule(null)
    setFormMode('create')
    setShowForm(true)
  }

  const handleEdit = (schedule: MaintenanceScheduleWithVehicle) => {
    setSelectedSchedule(schedule)
    setFormMode('edit')
    setShowForm(true)
  }

  const handleComplete = (schedule: MaintenanceScheduleWithVehicle) => {
    setSelectedSchedule(schedule)
    setFormMode('complete')
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelectedSchedule(null)
    handleRefresh()
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedSchedule(null)
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manutenzione Preventiva</h1>
          <p className="text-muted-foreground">
            Gestisci le programmazioni di manutenzione per tutti i veicoli
          </p>
        </div>
        <Button onClick={handleCreate} className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Nuova Programmazione
        </Button>
      </div>

      {/* Overdue Alert Banner */}
      <OverdueAlert key={`alert-${refreshKey}`} />

      {/* Main Content */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit sm:grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Elenco</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <MaintenanceList
            key={`list-${refreshKey}`}
            showFilters={true}
            onEdit={handleEdit}
            onComplete={handleComplete}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <MaintenanceCalendar
            key={`calendar-${refreshKey}`}
            onEventClick={handleEdit}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MaintenanceWidget className="md:col-span-2 lg:col-span-1" />
            
            {/* Additional dashboard widgets could go here */}
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <h3 className="font-semibold">Prossime Scadenze</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Visualizza le prossime scadenze di manutenzione per i tuoi veicoli
              </p>
              <Button 
                variant="outline" 
                className="mt-4 w-full"
                onClick={() => {
                  const element = document.querySelector('[value="list"]') as HTMLElement
                  element?.click()
                }}
              >
                Vai all&apos;elenco
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <h3 className="font-semibold">Storico Manutenzioni</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Visualizza lo storico delle manutenzioni completate
              </p>
              <Button 
                variant="outline" 
                className="mt-4 w-full"
                disabled
              >
                In arrivo
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <MaintenanceForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        schedule={selectedSchedule}
        mode={formMode}
      />
    </div>
  )
}
