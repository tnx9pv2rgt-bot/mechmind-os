"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarIcon, Save, X } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { WarrantyType, WarrantyTypeValues } from "@/lib/services/warrantyService"

const warrantyFormSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: z.enum(WarrantyTypeValues as [string, ...string[]]),
  provider: z.string().min(1, "Provider is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  expirationDate: z.date({
    required_error: "Expiration date is required",
  }),
  coverageKm: z.coerce.number().optional().nullable(),
  currentKm: z.coerce.number().min(0, "Current km must be positive"),
  maxCoverage: z.coerce.number().min(0, "Max coverage must be positive"),
  deductible: z.coerce.number().min(0, "Deductible must be positive"),
  terms: z.string().optional(),
  certificateUrl: z.string().url().optional().or(z.literal("")),
}).refine((data) => data.expirationDate > data.startDate, {
  message: "Expiration date must be after start date",
  path: ["expirationDate"],
})

type WarrantyFormValues = z.infer<typeof warrantyFormSchema>

interface WarrantyFormProps {
  initialData?: Partial<WarrantyFormValues>
  vehicles?: Array<{ id: string; make: string; model: string; year: number; vin: string }>
  onSubmit: (data: WarrantyFormValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function WarrantyForm({ 
  initialData, 
  vehicles = [], 
  onSubmit, 
  onCancel,
  isLoading = false 
}: WarrantyFormProps) {
  const form = useForm<WarrantyFormValues>({
    resolver: zodResolver(warrantyFormSchema),
    defaultValues: {
      vehicleId: initialData?.vehicleId || "",
      type: initialData?.type || WarrantyType.MANUFACTURER,
      provider: initialData?.provider || "",
      startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
      expirationDate: initialData?.expirationDate ? new Date(initialData.expirationDate) : undefined,
      coverageKm: initialData?.coverageKm ?? null,
      currentKm: initialData?.currentKm ?? 0,
      maxCoverage: initialData?.maxCoverage ?? 0,
      deductible: initialData?.deductible ?? 0,
      terms: initialData?.terms || "",
      certificateUrl: initialData?.certificateUrl || "",
    },
  })

  const handleSubmit = (data: WarrantyFormValues) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle */}
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.vin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Warranty Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warranty Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={WarrantyType.MANUFACTURER}>Manufacturer</SelectItem>
                    <SelectItem value={WarrantyType.EXTENDED}>Extended</SelectItem>
                    <SelectItem value={WarrantyType.DEALER}>Dealer</SelectItem>
                    <SelectItem value={WarrantyType.AS_IS}>As-Is</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Provider */}
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Manufacturer Name or Extended Warranty Co." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Current KM */}
          <FormField
            control={form.control}
            name="currentKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Kilometers</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormDescription>Kilometers at time of warranty creation</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Expiration Date */}
          <FormField
            control={form.control}
            name="expirationDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max Coverage */}
          <FormField
            control={form.control}
            name="maxCoverage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Coverage (€)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Deductible */}
          <FormField
            control={form.control}
            name="deductible"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deductible per Claim (€)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Coverage KM */}
          <FormField
            control={form.control}
            name="coverageKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coverage Limit (km)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    placeholder="Leave empty for unlimited"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : parseInt(e.target.value, 10)
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormDescription>Leave empty for unlimited mileage</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Certificate URL */}
          <FormField
            control={form.control}
            name="certificateUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>Link to warranty certificate PDF</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Terms */}
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms & Conditions URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>Link to warranty terms PDF</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Warranty"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default WarrantyForm
