'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ChevronLeft,
  Car,
  Shield,
  CheckCircle,
  Clock,
  Wind,
  Camera,
  QrCode,
  FileText,
  Download,
  Share2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

export default function InspectionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  // Mock data - in production fetch from API
  const inspection = {
    id,
    vehicle: 'BMW X5',
    plate: 'AB123CD',
    customer: 'Mario Rossi',
    type: 'PRE_PURCHASE',
    status: 'completed',
    date: '2026-03-04',
    score: 8.5,
    inspector: 'Tecnico A',
    mileage: 85000,
    blockchainHash: '0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    ipfsCID: 'QmX4z8y7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4',
    findings: [
      { category: 'Meccanica', status: 'good', count: 12 },
      { category: 'Carrozzeria', status: 'warning', count: 2 },
      { category: 'Elettronica', status: 'good', count: 8 },
      { category: 'Gomme', status: 'critical', count: 1 },
    ],
    sensory: {
      humidity: 45,
      moldRisk: 'LOW',
      odors: ['Nessuno']
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 dark:text-green-400'
    if (score >= 7) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#212121] dark:to-[#2f2f2f] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/inspections">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-[#ececec]">Ispezione {inspection.id}</h1>
                <Badge className="bg-green-500">Completata</Badge>
              </div>
              <p className="text-gray-500 dark:text-[#636366] text-sm">
                {inspection.vehicle} • {inspection.plate} • {inspection.date}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" className="rounded-full">
              <Share2 className="w-4 h-4 mr-2" />
              Condividi
            </Button>
            <Button className="rounded-full bg-gray-800 hover:bg-gray-900">
              <FileText className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          </div>
        </div>

        {/* Score Card */}
        <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className={`text-4xl font-bold text-white`}>
                    {inspection.score}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[#636366] mb-1">Overall Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(inspection.score)}`}>
                    {inspection.score}/10
                  </p>
                  <p className="text-sm text-gray-400 dark:text-[#6e6e6e] mt-1">Ottime condizioni generali</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <Badge className="bg-blue-100 text-blue-700">Certificata Blockchain</Badge>
                </div>
                <p className="text-xs text-gray-400 dark:text-[#6e6e6e] font-mono">
                  {inspection.blockchainHash.slice(0, 20)}...{inspection.blockchainHash.slice(-8)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl">
            <TabsTrigger value="summary">Riepilogo</TabsTrigger>
            <TabsTrigger value="details">Dettagli</TabsTrigger>
            <TabsTrigger value="video">Video 360°</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="warranty">Garanzia</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Veicolo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-[#636366]">Modello</span>
                    <span className="font-medium">{inspection.vehicle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-[#636366]">Targa</span>
                    <span className="font-medium">{inspection.plate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-[#636366]">Chilometraggio</span>
                    <span className="font-medium">{inspection.mileage.toLocaleString()} km</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Risultati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inspection.findings.map((finding) => (
                      <div key={finding.category} className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-[#636366]">{finding.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{finding.count} voci</span>
                          <div className={`w-3 h-3 rounded-full ${
                            finding.status === 'good' ? 'bg-green-500' :
                            finding.status === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6">
            <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="w-5 h-5" />
                  Analisi Sensoriale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-[#353535] rounded-2xl p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-[#636366] mb-1">Umidità Interna</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#ececec]">{inspection.sensory.humidity}%</p>
                    <Progress value={inspection.sensory.humidity} className="h-2 mt-2" />
                  </div>
                  <div className="bg-gray-50 dark:bg-[#353535] rounded-2xl p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-[#636366] mb-1">Rischio Muffa</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{inspection.sensory.moldRisk}</p>
                    <Badge className="mt-2 bg-green-100 text-green-700">Ottimale</Badge>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#353535] rounded-2xl p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-[#636366] mb-1">Odori</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#ececec]">{inspection.sensory.odors[0]}</p>
                    <Badge className="mt-2 bg-green-100 text-green-700">Nessuno</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="mt-6">
            <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-[#353535] flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-[#ececec] mb-2">Video 360° Walkaround</h3>
                <p className="text-gray-500 dark:text-[#636366] max-w-md mx-auto mb-6">
                  Video ispezione completo con annotazioni AI e hotspot interattivi.
                </p>
                <div className="flex justify-center gap-2">
                  <Badge variant="outline">📹 HLS Streaming</Badge>
                  <Badge variant="outline">🎯 Hotspots</Badge>
                  <Badge variant="outline">📍 GPS Tagged</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blockchain Tab */}
          <TabsContent value="blockchain" className="mt-6">
            <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Certificazione Blockchain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center py-8">
                  <div className="w-48 h-48 bg-gray-100 dark:bg-[#353535] rounded-2xl flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                    <span className="text-gray-500 dark:text-[#636366]">Network</span>
                    <Badge>Polygon Mainnet</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                    <span className="text-gray-500 dark:text-[#636366]">Contract Address</span>
                    <code className="text-sm bg-gray-100 dark:bg-[#353535] px-2 py-1 rounded">
                      {inspection.blockchainHash.slice(0, 20)}...
                    </code>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                    <span className="text-gray-500 dark:text-[#636366]">IPFS CID</span>
                    <code className="text-sm bg-gray-100 dark:bg-[#353535] px-2 py-1 rounded">
                      {inspection.ipfsCID.slice(0, 20)}...
                    </code>
                  </div>
                </div>
                <Button className="w-full rounded-full" variant="outline">
                  Verifica su PolygonScan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warranty Tab */}
          <TabsContent value="warranty" className="mt-6">
            <Card className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-[#ececec] mb-2">Garanzia Estesa</h3>
                <p className="text-gray-500 dark:text-[#636366] max-w-md mx-auto">
                  Configura la garanzia estesa con tracciamento blockchain e gestione claims.
                </p>
                <Button className="mt-6 rounded-full">
                  Attiva Garanzia
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feature Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 dark:text-gray-300">Powered by</p>
              <p className="font-medium">Vehicle Inspection System 2026</p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-white/20 text-white">AI Vision</Badge>
              <Badge className="bg-white/20 text-white">Blockchain</Badge>
              <Badge className="bg-white/20 text-white">360° Video</Badge>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
