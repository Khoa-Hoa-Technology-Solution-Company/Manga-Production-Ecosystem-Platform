type ClassValue = string | undefined | false | null

export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ')
}
