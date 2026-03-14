/**
 * UPGRADE PROMPT COMPONENT
 * 
 * Shows when users reach or approach plan limits
 */

'use client';

import { useState } from 'react';
type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Users, Building2, HardDrive, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LimitType = 'users' | 'locations' | 'apiCalls' | 'storage' | 'customers' | 'inspections';

interface LimitStatus {
  withinLimit: boolean;
  current: number;
  limit: number | null;
  remaining: number;
  percentageUsed: number;
  warningLevel?: 'none' | 'warning' | 'critical';
}

interface UpgradePromptProps {
  limit: LimitStatus;
  type: LimitType;
  currentPlan: SubscriptionPlan;
  onUpgrade: () => void;
  onDismiss?: () => void;
  className?: string;
}

const LIMIT_CONFIG: Record<LimitType, { 
  icon: typeof Users; 
  name: string; 
  description: string;
  nextPlanLimit: Record<string, string>;
}> = {
  users: {
    icon: Users,
    name: 'Users',
    description: 'Team members who can access the system',
    nextPlanLimit: {
      'STARTER': '10 users',
      'PROFESSIONAL': 'Unlimited users',
      'ENTERPRISE': 'Already unlimited',
      'TRIAL': '3 users',
      'FREE': '1 user',
    },
  },
  locations: {
    icon: Building2,
    name: 'Locations',
    description: 'Workshop locations you can manage',
    nextPlanLimit: {
      'STARTER': '2 locations',
      'PROFESSIONAL': 'Unlimited locations',
      'ENTERPRISE': 'Already unlimited',
      'TRIAL': '1 location',
      'FREE': '1 location',
    },
  },
  apiCalls: {
    icon: ArrowRight,
    name: 'API Calls',
    description: 'Monthly API usage limit',
    nextPlanLimit: {
      'STARTER': '25,000/month',
      'PROFESSIONAL': 'Unlimited',
      'ENTERPRISE': 'Already unlimited',
      'TRIAL': '5,000/month',
      'FREE': '1,000/month',
    },
  },
  storage: {
    icon: HardDrive,
    name: 'Storage',
    description: 'File and data storage limit',
    nextPlanLimit: {
      'STARTER': '50 GB',
      'PROFESSIONAL': 'Unlimited',
      'ENTERPRISE': 'Already unlimited',
      'TRIAL': '10 GB',
      'FREE': '5 GB',
    },
  },
  customers: {
    icon: Users,
    name: 'Customers',
    description: 'Maximum customers you can store',
    nextPlanLimit: {
      'STARTER': '2,500 customers',
      'PROFESSIONAL': 'Unlimited customers',
      'ENTERPRISE': 'Already unlimited',
      'TRIAL': '500 customers',
      'FREE': '100 customers',
    },
  },
  inspections: {
    icon: ArrowRight,
    name: 'Inspections',
    description: 'Monthly vehicle inspection limit',
    nextPlanLimit: {
      'STARTER': '1,000/month',
      'PROFESSIONAL': 'Unlimited',
      'ENTERPRISE': 'Already unlimited',
      'TRIAL': '200/month',
      'FREE': '50/month',
    },
  },
};

export function UpgradePrompt({ 
  limit, 
  type, 
  currentPlan, 
  onUpgrade, 
  onDismiss,
  className 
}: UpgradePromptProps) {
  const [showDetails, setShowDetails] = useState(false);
  const config = LIMIT_CONFIG[type];
  const Icon = config.icon;

  // Don't show if at enterprise or unlimited
  if (currentPlan === 'ENTERPRISE' || limit.limit === null) {
    return null;
  }

  // Show banner based on warning level
  if (limit.warningLevel === 'none' && limit.withinLimit) {
    return null;
  }

  const isExceeded = !limit.withinLimit;
  const isCritical = limit.warningLevel === 'critical' || isExceeded;

  return (
    <>
      <Card className={cn(
        "border-l-4",
        isExceeded ? "border-l-red-500 bg-red-50" : 
        isCritical ? "border-l-orange-500 bg-orange-50" : 
        "border-l-yellow-500 bg-yellow-50",
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            <div className={cn(
              "p-2 rounded-full",
              isExceeded ? "bg-red-100 text-red-600" : 
              isCritical ? "bg-orange-100 text-orange-600" : 
              "bg-yellow-100 text-yellow-600"
            )}>
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "font-semibold",
                  isExceeded ? "text-red-900" : 
                  isCritical ? "text-orange-900" : 
                  "text-yellow-900"
                )}>
                  {isExceeded ? `${config.name} Limit Reached` : 
                   `Approaching ${config.name} Limit`}
                </h4>
                {onDismiss && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={onDismiss}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <p className={cn(
                "text-sm mt-1",
                isExceeded ? "text-red-700" : 
                isCritical ? "text-orange-700" : 
                "text-yellow-700"
              )}>
                {isExceeded 
                  ? `You've reached your ${config.name.toLowerCase()} limit. Upgrade your plan to continue.`
                  : `You've used ${Math.round(limit.percentageUsed)}% of your ${config.name.toLowerCase()} limit.`
                }
              </p>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className={cn(
                    isExceeded ? "text-red-600" : 
                    isCritical ? "text-orange-600" : 
                    "text-yellow-600"
                  )}>
                    {limit.current.toLocaleString()} / {limit.limit?.toLocaleString()}
                  </span>
                  <span className={cn(
                    isExceeded ? "text-red-600" : 
                    isCritical ? "text-orange-600" : 
                    "text-yellow-600"
                  )}>
                    {Math.round(limit.percentageUsed)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(limit.percentageUsed, 100)} 
                  className={cn(
                    "h-2",
                    isExceeded ? "bg-red-200 [&>div]:bg-red-500" : 
                    isCritical ? "bg-orange-200 [&>div]:bg-orange-500" : 
                    "bg-yellow-200 [&>div]:bg-yellow-500"
                  )}
                />
              </div>

              {/* Upgrade CTA */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-gray-600">
                  Next plan: <span className="font-medium">{config.nextPlanLimit[currentPlan]}</span>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(true)}
                  >
                    View Plans
                  </Button>
                  <Button 
                    size="sm"
                    className={cn(
                      isExceeded ? "bg-red-600 hover:bg-red-700" : 
                      isCritical ? "bg-orange-600 hover:bg-orange-700" : 
                      "bg-yellow-600 hover:bg-yellow-700"
                    )}
                    onClick={onUpgrade}
                  >
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Icon className="w-5 h-5" />
              <span>{config.name} Usage Details</span>
            </DialogTitle>
            <DialogDescription>
              {config.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Usage */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-4">Current Usage</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Used</span>
                  <span className="font-medium">{limit.current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Limit</span>
                  <span className="font-medium">{limit.limit?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining</span>
                  <span className={cn(
                    "font-medium",
                    limit.remaining < 10 ? "text-red-600" : "text-green-600"
                  )}>
                    {limit.remaining.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Percentage Used</span>
                  <span className="font-medium">{Math.round(limit.percentageUsed)}%</span>
                </div>
              </div>
            </div>

            {/* Upgrade Options */}
            <div>
              <h4 className="font-medium mb-3">Upgrade Options</h4>
              <div className="space-y-2">
                {currentPlan === 'TRIAL' && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Piccole Plan</p>
                      <p className="text-sm text-gray-500">3 users, 1 location</p>
                    </div>
                    <Badge>€100/mo</Badge>
                  </div>
                )}
                {(currentPlan === 'TRIAL' || currentPlan === 'STARTER') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <div>
                      <p className="font-medium">Medie Plan</p>
                      <p className="text-sm text-gray-500">10 users, 2 locations</p>
                    </div>
                    <Badge className="bg-blue-500">€390.90/mo</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Grandi Plan</p>
                    <p className="text-sm text-gray-500">Unlimited everything</p>
                  </div>
                  <Badge variant="outline">Custom pricing</Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowDetails(false); onUpgrade(); }}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook-friendly version for automatic limit checking
interface AutoUpgradePromptProps {
  limits: Record<LimitType, LimitStatus>;
  currentPlan: SubscriptionPlan;
  onUpgrade: () => void;
  className?: string;
}

export function AutoUpgradePrompt({ limits, currentPlan, onUpgrade, className }: AutoUpgradePromptProps) {
  const [dismissed, setDismissed] = useState<LimitType[]>([]);

  // Find the most critical limit
  const criticalLimits = Object.entries(limits)
    .filter(([type, limit]) => {
      if (dismissed.includes(type as LimitType)) return false;
      return !limit.withinLimit || (limit.warningLevel && limit.warningLevel !== 'none');
    })
    .sort((a, b) => {
      // Sort by severity: exceeded first, then by percentage used
      if (!a[1].withinLimit && b[1].withinLimit) return -1;
      if (a[1].withinLimit && !b[1].withinLimit) return 1;
      return b[1].percentageUsed - a[1].percentageUsed;
    });

  if (criticalLimits.length === 0) return null;

  const [type, limit] = criticalLimits[0];

  return (
    <UpgradePrompt
      limit={limit}
      type={type as LimitType}
      currentPlan={currentPlan}
      onUpgrade={onUpgrade}
      onDismiss={() => setDismissed([...dismissed, type as LimitType])}
      className={className}
    />
  );
}

export default UpgradePrompt;
