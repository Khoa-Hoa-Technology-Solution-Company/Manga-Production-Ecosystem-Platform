const padDatePart = (value: number) => String(value).padStart(2, '0')

export function toLocalDateTimeInputValue(date: Date): string {
  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
  ].join('T')
}

export function getMinDateTimeLocal(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() + 1, 0, 0)
  return toLocalDateTimeInputValue(date)
}

export function getDefaultPublicationStart(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setSeconds(0, 0)
  return toLocalDateTimeInputValue(date)
}

export function getLocalDateAfterDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}
