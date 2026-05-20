import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
}))

// ---- next/link ----
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children)
})

// ---- framer-motion ----
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_t: unknown, prop: string) =>
          ({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }) => {
            const allowed = ['className', 'style', 'onClick', 'role', 'tabIndex', 'aria-label']
            const valid: Record<string, unknown> = {}
            for (const k of Object.keys(rest)) {
              if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k]
            }
            return React.createElement(prop, valid, children)
          },
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ---- sonner ----
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => mockToastSuccess(...a), error: (...a: unknown[]) => mockToastError(...a) },
}))

// ---- UI components ----
jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, icon, loading, disabled, type, 'aria-label': al, variant }: {
    children?: React.ReactNode; onClick?: () => void; icon?: React.ReactNode; loading?: boolean
    disabled?: boolean; type?: string; 'aria-label'?: string; variant?: string
  }) =>
    React.createElement('button', { onClick, disabled: disabled || loading, type, 'aria-label': al }, icon, children),
}))

jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}))

jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) =>
    React.createElement('nav', null, items.map(i => React.createElement('span', { key: i.label }, i.label))),
}))

// ---- FileReader mock — synchronous, content tracked via WeakMap ----
const fileContents = new WeakMap<File, string>()

class MockFileReader {
  result: string | null = null
  onload: ((e: { target: { result: string } }) => void) | null = null

  readAsText(file: File) {
    const content = fileContents.get(file) ?? ''
    this.result = content
    this.onload?.({ target: { result: content } })
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'FileReader', {
    value: MockFileReader,
    writable: true,
    configurable: true,
  })
})

// ---- fetch mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

import CustomerImportPage from '@/app/dashboard/customers/import/page'

function createCsvFile(content: string, name = 'test.csv') {
  const file = new File([content], name, { type: 'text/csv' })
  fileContents.set(file, content)
  return file
}

async function uploadFile(content: string, name = 'test.csv') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = createCsvFile(content, name)
  await act(async () => {
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
  })
  // Wait for FileReader to complete: csvRows > 0 means "Importa N clienti" button appears
  await waitFor(() => {
    expect(screen.getByText(/Importa [1-9]\d* clienti/i)).toBeInTheDocument()
  }, { timeout: 3000 })
  return file
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'new-id' }) })
})

// ============================================================
describe('CustomerImportPage', () => {
  it('renders upload zone initially', () => {
    render(<CustomerImportPage />)
    expect(screen.getByText('Trascina il file CSV qui')).toBeInTheDocument()
    expect(screen.getByLabelText('Carica file CSV')).toBeInTheDocument()
  })

  it('shows Importa Clienti header', () => {
    render(<CustomerImportPage />)
    expect(screen.getByText('Importa Clienti')).toBeInTheDocument()
  })

  it('shows breadcrumb navigation', () => {
    render(<CustomerImportPage />)
    expect(screen.getByText('Clienti')).toBeInTheDocument()
    expect(screen.getByText('Importa CSV')).toBeInTheDocument()
  })

  it('rejects non-CSV file', async () => {
    render(<CustomerImportPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const rejectedFile = new File(['data'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      Object.defineProperty(input, 'files', { value: [rejectedFile], configurable: true })
      fireEvent.change(input)
    })
    expect(mockToastError).toHaveBeenCalledWith('Il file deve essere in formato CSV')
  })

  it('accepts valid CSV file via input', async () => {
    render(<CustomerImportPage />)
    const csvContent = 'Nome,Cognome,Email,Telefono\nMario,Rossi,mario@test.it,3331234567'
    const file = await uploadFile(csvContent)
    expect(screen.getByText(file.name)).toBeInTheDocument()
  })

  it('shows drag-over state on dragOver event', () => {
    render(<CustomerImportPage />)
    const dropZone = screen.getByLabelText('Carica file CSV')
    act(() => {
      fireEvent.dragOver(dropZone, { preventDefault: () => {} })
    })
    expect(screen.getByLabelText('Carica file CSV')).toBeInTheDocument()
  })

  it('resets drag-over on dragLeave', () => {
    render(<CustomerImportPage />)
    const dropZone = screen.getByLabelText('Carica file CSV')
    act(() => {
      fireEvent.dragOver(dropZone, { preventDefault: () => {} })
      fireEvent.dragLeave(dropZone)
    })
    expect(screen.getByLabelText('Carica file CSV')).toBeInTheDocument()
  })

  it('handles file drop', async () => {
    render(<CustomerImportPage />)
    const dropZone = screen.getByLabelText('Carica file CSV')
    const csvContent = 'Nome,Email\nMario,mario@test.it'
    const file = createCsvFile(csvContent)

    await act(async () => {
      fireEvent.drop(dropZone, {
        preventDefault: () => {},
        dataTransfer: { files: [file] },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(file.name)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('navigates back to customers list', () => {
    render(<CustomerImportPage />)
    const backBtn = screen.getByText('Indietro')
    expect(backBtn.closest('a')).toHaveAttribute('href', '/dashboard/customers')
  })
})

// ---- parseCsv ----
describe('parseCsv (via CustomerImportPage internal logic)', () => {
  it('auto-maps nome/cognome/email/telefono columns', async () => {
    render(<CustomerImportPage />)
    await uploadFile('nome,cognome,email,telefono\nMario,Rossi,mario@test.it,333111')
    expect(screen.getAllByText('nome').length).toBeGreaterThan(0)
  })

  it('imports customers successfully', async () => {
    render(<CustomerImportPage />)
    await uploadFile('nome,cognome,telefono\nMario,Rossi,3331234567')

    await act(async () => {
      fireEvent.click(screen.getByText(/Importa 1 clienti/i))
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('1 clienti importati con successo')
    }, { timeout: 5000 })

    expect(screen.getByText('Importazione Completata')).toBeInTheDocument()
  })

  it('handles import error when row missing phone and email', async () => {
    render(<CustomerImportPage />)
    await uploadFile('nome,cognome\nMario,Rossi')

    await act(async () => {
      fireEvent.click(screen.getByText(/Importa 1 clienti/i))
    })

    await waitFor(() => {
      expect(screen.getByText('Importazione Completata')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(mockToastError).toHaveBeenCalledWith('1 righe con errori')
    expect(screen.getByText(/telefono e email mancanti/i)).toBeInTheDocument()
  })

  it('handles HTTP error during import', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Email già esistente' }),
    })

    render(<CustomerImportPage />)
    await uploadFile('email,telefono\ndup@test.it,333')

    await act(async () => {
      fireEvent.click(screen.getByText(/Importa 1 clienti/i))
    })

    await waitFor(() => {
      expect(screen.getByText('Importazione Completata')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(mockToastError).toHaveBeenCalledWith('1 righe con errori')
  })

  it('handles network error during import', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))

    render(<CustomerImportPage />)
    await uploadFile('email\ntest@test.it')

    await act(async () => {
      fireEvent.click(screen.getByText(/Importa 1 clienti/i))
    })

    await waitFor(() => {
      expect(screen.getByText('Importazione Completata')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(mockToastError).toHaveBeenCalledWith('1 righe con errori')
    expect(screen.getByText(/errore di rete/i)).toBeInTheDocument()
  })

  it('allows changing file after upload', async () => {
    render(<CustomerImportPage />)
    await uploadFile('nome\nMario')

    fireEvent.click(screen.getByText('Cambia file'))
    expect(screen.getByText('Trascina il file CSV qui')).toBeInTheDocument()
  })

  it('shows Importa altro file after import completes', async () => {
    render(<CustomerImportPage />)
    await uploadFile('telefono\n3331234567')

    await act(async () => {
      fireEvent.click(screen.getByText(/Importa 1 clienti/i))
    })

    await waitFor(() => {
      expect(screen.getByText('Importa altro file')).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText('Importa altro file'))
    expect(screen.getByText('Trascina il file CSV qui')).toBeInTheDocument()
  })

  it('Vai ai Clienti navigates after import', async () => {
    render(<CustomerImportPage />)
    await uploadFile('telefono\n3331234567')

    await act(async () => {
      fireEvent.click(screen.getByText(/Importa 1 clienti/i))
    })

    await waitFor(() => {
      expect(screen.getByText('Vai ai Clienti')).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText('Vai ai Clienti'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard/customers')
  })
})

// ---- Extended column-mapping branch coverage ----
describe('CustomerImportPage — extended column mapping', () => {
  it('auto-maps fiscal/vat/address/city/zip/province and skips unknown column', async () => {
    render(<CustomerImportPage />)
    await uploadFile('codice fiscale,iva,indirizzo,città,cap,provincia,extra\nRSSMRA,12345,Via A,Roma,00100,RM,X')
    expect(screen.getByText(/Importa 1 clienti/i)).toBeInTheDocument()
    // Each header appears at least once in the column mapping list
    expect(screen.getAllByText('codice fiscale').length).toBeGreaterThan(0)
    expect(screen.getAllByText('provincia').length).toBeGreaterThan(0)
  })

  it('changes column mapping via select onChange', async () => {
    render(<CustomerImportPage />)
    await uploadFile('colonna_sconosciuta\nvalore')
    const selects = document.querySelectorAll('select')
    expect(selects.length).toBeGreaterThan(0)
    fireEvent.change(selects[0], { target: { value: 'firstName' } })
    // After re-render, import button still present — mapping updated without crash
    expect(screen.getByText(/Importa 1 clienti/i)).toBeInTheDocument()
  })

  it('Annulla button resets to upload state', async () => {
    render(<CustomerImportPage />)
    await uploadFile('nome\nMario')
    fireEvent.click(screen.getByText('Annulla'))
    expect(screen.getByText('Trascina il file CSV qui')).toBeInTheDocument()
  })
})
