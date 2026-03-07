import { redirect } from 'next/navigation'

/**
 * Portal Root Page
 * Redirects to dashboard or login based on auth status
 */
export default function PortalPage() {
  // This will be handled by the layout middleware
  // But we redirect to login as default
  redirect('/portal/login')
}
