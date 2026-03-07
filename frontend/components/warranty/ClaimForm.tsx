"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Upload, FileText, X, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

const claimFormSchema = z.object({
  issueDescription: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  estimatedCost: z.coerce.number().min(0.01, "Estimated cost must be greater than 0"),
  evidence: z.array(z.string().url()).default([]),
})

type ClaimFormValues = z.infer<typeof claimFormSchema>

interface ClaimFormProps {
  warrantyId: string
  maxClaimAmount?: number
  deductible?: number
  onSubmit: (data: ClaimFormValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function ClaimForm({ 
  warrantyId,
  maxClaimAmount,
  deductible = 0,
  onSubmit, 
  onCancel,
  isLoading = false 
}: ClaimFormProps) {
  const { toast } = useToast()
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([])
  const [isUploading, setIsUploading] = React.useState(false)

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      issueDescription: "",
      estimatedCost: 0,
      evidence: [],
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      // Simulate file upload - in production, this would upload to a storage service
      const newUrls: string[] = []
      
      for (const file of Array.from(files)) {
        // In production, upload to your storage service here
        // const url = await uploadToStorage(file)
        const objectUrl = URL.createObjectURL(file)
        newUrls.push(objectUrl)
      }

      setUploadedFiles((prev) => [...prev, ...newUrls])
      form.setValue("evidence", [...uploadedFiles, ...newUrls])

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    form.setValue("evidence", newFiles)
  }

  const handleSubmit = (data: ClaimFormValues) => {
    // Check if claim amount exceeds max coverage
    if (maxClaimAmount && data.estimatedCost > maxClaimAmount) {
      toast({
        title: "Amount exceeds coverage",
        description: `Maximum claim amount is €${maxClaimAmount.toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    onSubmit(data)
  }

  const estimatedCost = form.watch("estimatedCost")
  const netAmount = estimatedCost > 0 ? Math.max(0, estimatedCost - deductible) : 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Issue Description */}
        <FormField
          control={form.control}
          name="issueDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue in detail. Include symptoms, when it started, and any relevant information..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a detailed description of the issue for review
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Estimated Cost */}
        <FormField
          control={form.control}
          name="estimatedCost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Repair Cost (€)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  step="0.01" 
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              {maxClaimAmount && (
                <FormDescription>
                  Maximum claim amount: €{maxClaimAmount.toFixed(2)}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Deductible Info */}
        {deductible > 0 && estimatedCost > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estimated Cost:</span>
              <span className="font-medium">€{estimatedCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Deductible:</span>
              <span className="font-medium text-amber-600">-€{deductible.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="font-medium text-gray-900">Net Amount:</span>
              <span className="font-semibold text-green-600">€{netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Evidence Upload */}
        <FormField
          control={form.control}
          name="evidence"
          render={() => (
            <FormItem>
              <FormLabel>Photo Evidence</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload photos of the damage or issue
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Supported formats: JPG, PNG, HEIC
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="evidence-upload"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => document.getElementById("evidence-upload")?.click()}
                    >
                      {isUploading ? "Uploading..." : "Select Files"}
                    </Button>
                  </div>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        {uploadedFiles.length} file(s) uploaded
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {uploadedFiles.map((url, index) => (
                          <div
                            key={index}
                            className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100"
                          >
                            <img
                              src={url}
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload clear photos showing the issue for faster claim processing
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || isUploading}>
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ClaimForm
