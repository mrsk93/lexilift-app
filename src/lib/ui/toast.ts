import { toast } from 'sonner'

export const notify = {
  success: (m: string) => toast.success(m),
  error: (m: string) => toast.error(m),
  info: (m: string) => toast.info(m),
  warning: (m: string) => toast.warning(m),
}
