/**
 * ARIA Utilities
 * Funzioni helper per attributi ARIA e accessibilità
 * WCAG 2.1 AA Compliant
 */

/**
 * Genera ID univoco per elementi ARIA
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Costruisce stringa aria-describedby da elementi
 */
export function buildDescribedBy(...ids: (string | undefined | false | null)[]): string | undefined {
  const validIds = ids.filter((id): id is string => Boolean(id));
  return validIds.length > 0 ? validIds.join(' ') : undefined;
}

/**
 * Verifica se un elemento è focusabile
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ];

  if (!focusableSelectors.some((selector) => element.matches(selector))) {
    return false;
  }

  // Verifica visibilità
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Ottiene tutti gli elementi focusabili in un container
 */
export function getFocusableElements(
  container: HTMLElement | Document = document,
  selector?: string
): HTMLElement[] {
  const defaultSelector = [
    'button:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
    'a[href]:not([tabindex="-1"]):not([aria-hidden="true"])',
    'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"]):not([aria-hidden="true"])',
    'select:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
  ].join(', ');

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selector || defaultSelector)
  );

  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetParent !== null
    );
  });
}

/**
 * Focusa il primo elemento focusabile in un container
 */
export function focusFirstElement(container: HTMLElement): boolean {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[0].focus();
    return true;
  }
  return false;
}

/**
 * Gestione attributi ARIA per form
 */
export interface FormFieldAriaProps {
  id: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-errormessage'?: string;
  'aria-invalid': boolean;
  'aria-required'?: boolean;
  'aria-disabled'?: boolean;
  'aria-readonly'?: boolean;
}

export function buildFormFieldAria(props: {
  id: string;
  labelId?: string;
  errorId?: string;
  hintId?: string;
  hasError: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  ariaLabel?: string;
}): FormFieldAriaProps {
  const {
    id,
    labelId,
    errorId,
    hintId,
    hasError,
    isRequired,
    isDisabled,
    isReadOnly,
    ariaLabel,
  } = props;

  const describedBy = buildDescribedBy(hintId, hasError ? errorId : undefined);

  return {
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': labelId,
    'aria-describedby': describedBy,
    'aria-errormessage': hasError ? errorId : undefined,
    'aria-invalid': hasError,
    'aria-required': isRequired,
    'aria-disabled': isDisabled,
    'aria-readonly': isReadOnly,
  };
}

/**
 * Costruisce attributi per role="form"
 */
export function buildFormAria(props: {
  formId: string;
  title?: string;
  titleId?: string;
  description?: string;
  descriptionId?: string;
  isInvalid?: boolean;
  errorSummaryId?: string;
}): React.HTMLAttributes<HTMLFormElement> {
  const { formId, titleId, descriptionId, isInvalid, errorSummaryId } = props;

  return {
    id: formId,
    role: 'form',
    'aria-labelledby': titleId,
    'aria-describedby': buildDescribedBy(descriptionId, isInvalid ? errorSummaryId : undefined),
    'aria-invalid': isInvalid,
  };
}

/**
 * Costruisce attributi per role="group" (fieldset)
 */
export function buildGroupAria(props: {
  groupId: string;
  legendId?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}): React.HTMLAttributes<HTMLFieldSetElement> {
  const { groupId, legendId, isRequired, isDisabled } = props;

  return {
    id: groupId,
    role: 'group',
    'aria-labelledby': legendId,
    'aria-required': isRequired,
    'aria-disabled': isDisabled,
  };
}

/**
 * Costruisce attributi per live region
 */
export function buildLiveRegion(
  priority: 'polite' | 'assertive' | 'off' = 'polite',
  atomic: boolean = true
): React.HTMLAttributes<HTMLDivElement> {
  return {
    'aria-live': priority,
    'aria-atomic': atomic,
    'aria-relevant': 'additions text',
  };
}

/**
 * Costruisce attributi per progress/loading
 */
export function buildProgressAria(props: {
  value: number;
  max?: number;
  label?: string;
  labelId?: string;
  isIndeterminate?: boolean;
}): React.HTMLAttributes<HTMLDivElement> {
  const { value, max = 100, labelId, isIndeterminate } = props;

  return {
    role: 'progressbar',
    'aria-valuenow': isIndeterminate ? undefined : value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuetext': isIndeterminate ? 'In progress' : `${Math.round((value / max) * 100)}%`,
    'aria-labelledby': labelId,
    'aria-busy': true,
  };
}

/**
 * Costruisce attributi per modal/dialog
 */
export function buildModalAria(props: {
  modalId: string;
  titleId: string;
  descriptionId?: string;
}): React.HTMLAttributes<HTMLDivElement> {
  const { modalId, titleId, descriptionId } = props;

  return {
    id: modalId,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId,
  };
}

/**
 * Costruisce attributi per alert
 */
export function buildAlertAria(
  type: 'error' | 'warning' | 'success' | 'info' = 'info'
): React.HTMLAttributes<HTMLDivElement> {
  const isAssertive = type === 'error' || type === 'warning';

  return {
    role: 'alert',
    'aria-live': isAssertive ? 'assertive' : 'polite',
    'aria-atomic': true,
  };
}

/**
 * Costruisce attributi per tablist
 */
export function buildTabListAria(props: {
  tablistId: string;
  label?: string;
  labelId?: string;
}): React.HTMLAttributes<HTMLDivElement> {
  const { tablistId, labelId } = props;

  return {
    id: tablistId,
    role: 'tablist',
    'aria-label': props.label,
    'aria-labelledby': labelId,
  };
}

/**
 * Costruisce attributi per tab
 */
export function buildTabAria(props: {
  tabId: string;
  panelId: string;
  isSelected: boolean;
  index: number;
  totalTabs: number;
}): React.HTMLAttributes<HTMLButtonElement> {
  const { tabId, panelId, isSelected, index, totalTabs } = props;

  return {
    id: tabId,
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': panelId,
    tabIndex: isSelected ? 0 : -1,
    'aria-posinset': index + 1,
    'aria-setsize': totalTabs,
  };
}

/**
 * Costruisce attributi per tabpanel
 */
export function buildTabPanelAria(props: {
  panelId: string;
  tabId: string;
  isHidden: boolean;
}): React.HTMLAttributes<HTMLDivElement> {
  const { panelId, tabId, isHidden } = props;

  return {
    id: panelId,
    role: 'tabpanel',
    'aria-labelledby': tabId,
    hidden: isHidden,
    tabIndex: 0,
  };
}

/**
 * Costruisce attributi per stepper/wizard
 */
export function buildStepperAria(props: {
  stepperId: string;
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}): {
  container: React.HTMLAttributes<HTMLElement>;
  step: (index: number) => React.HTMLAttributes<HTMLElement>;
} {
  const { stepperId, currentStep, totalSteps, stepTitles } = props;

  return {
    container: {
      id: stepperId,
      role: 'navigation',
      'aria-label': `Progresso: step ${currentStep} di ${totalSteps}`,
    },
    step: (index: number) => ({
      'aria-current': index + 1 === currentStep ? 'step' : undefined,
      'aria-label': `${stepTitles[index]} (${index + 1 === currentStep ? 'corrente' : index + 1 < currentStep ? 'completato' : 'da completare'})`,
      'aria-posinset': index + 1,
      'aria-setsize': totalSteps,
    }),
  };
}

/**
 * Costruisce attributi per breadcrumb
 */
export function buildBreadcrumbAria(): React.HTMLAttributes<HTMLElement> {
  return {
    'aria-label': 'Breadcrumb',
  };
}

/**
 * Costruisce attributi per link breadcrumb
 */
export function buildBreadcrumbLinkAria(
  isCurrent: boolean
): React.HTMLAttributes<HTMLAnchorElement | HTMLSpanElement> {
  return isCurrent
    ? { 'aria-current': 'page' }
    : {};
}

/**
 * Costruisce attributi per menu
 */
export function buildMenuAria(props: {
  menuId: string;
  label?: string;
  labelId?: string;
}): React.HTMLAttributes<HTMLUListElement> {
  const { menuId, label, labelId } = props;

  return {
    id: menuId,
    role: 'menu',
    'aria-label': label,
    'aria-labelledby': labelId,
  };
}

/**
 * Costruisce attributi per menuitem
 */
export function buildMenuItemAria(props: {
  hasSubmenu?: boolean;
  isExpanded?: boolean;
}): React.HTMLAttributes<HTMLLIElement> {
  const { hasSubmenu, isExpanded } = props;

  return {
    role: 'menuitem',
    'aria-haspopup': hasSubmenu ? 'menu' : undefined,
    'aria-expanded': hasSubmenu ? isExpanded : undefined,
  };
}

/**
 * Costruisce attributi per switch/toggle
 */
export function buildSwitchAria(props: {
  switchId: string;
  labelId?: string;
  isChecked: boolean;
  isDisabled?: boolean;
}): React.HTMLAttributes<HTMLButtonElement> {
  const { switchId, labelId, isChecked, isDisabled } = props;

  return {
    id: switchId,
    role: 'switch',
    'aria-checked': isChecked,
    'aria-labelledby': labelId,
    'aria-disabled': isDisabled,
    tabIndex: isDisabled ? -1 : 0,
  };
}

/**
 * Costruisce attributi per slider/range
 */
export function buildSliderAria(props: {
  sliderId: string;
  labelId?: string;
  value: number;
  min: number;
  max: number;
  isDisabled?: boolean;
}): React.HTMLAttributes<HTMLDivElement> {
  const { sliderId, labelId, value, min, max, isDisabled } = props;

  return {
    id: sliderId,
    role: 'slider',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuetext': `${value}`,
    'aria-labelledby': labelId,
    'aria-disabled': isDisabled,
    tabIndex: isDisabled ? -1 : 0,
  };
}

/**
 * Costruisce attributi per tooltip
 */
export function buildTooltipAria(props: {
  tooltipId: string;
  triggerId: string;
  isVisible: boolean;
}): React.HTMLAttributes<HTMLDivElement> {
  const { tooltipId, triggerId, isVisible } = props;

  return {
    id: tooltipId,
    role: 'tooltip',
    'aria-hidden': !isVisible,
  };
}

export function buildTooltipTriggerAria(props: {
  triggerId: string;
  tooltipId: string;
  hasTooltip: boolean;
}): React.HTMLAttributes<HTMLElement> {
  const { triggerId, tooltipId, hasTooltip } = props;

  return {
    id: triggerId,
    'aria-describedby': hasTooltip ? tooltipId : undefined,
  };
}

// Default export con tutte le funzioni
export default {
  generateA11yId,
  buildDescribedBy,
  isFocusable,
  getFocusableElements,
  focusFirstElement,
  buildFormFieldAria,
  buildFormAria,
  buildGroupAria,
  buildLiveRegion,
  buildProgressAria,
  buildModalAria,
  buildAlertAria,
  buildTabListAria,
  buildTabAria,
  buildTabPanelAria,
  buildStepperAria,
  buildBreadcrumbAria,
  buildBreadcrumbLinkAria,
  buildMenuAria,
  buildMenuItemAria,
  buildSwitchAria,
  buildSliderAria,
  buildTooltipAria,
  buildTooltipTriggerAria,
};
