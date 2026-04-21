function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function getNowParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}:${seconds}`,
    iso: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`,
  };
}

export function getTodayDate() {
  return getNowParts().date;
}

export function shiftDate(date: string, days: number) {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

export function getDateRangePreset(days: number) {
  const end = getTodayDate();
  const start = shiftDate(end, -(days - 1));
  return {
    dataInicial: start,
    dataFinal: end,
  };
}

export function buildFileStamp() {
  const { date, time } = getNowParts();
  return `${date}_${time.slice(0, 5).replace(':', '-')}`;
}

export function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function clampPeriod(dataInicial: string, dataFinal: string) {
  if (dataInicial <= dataFinal) {
    return { dataInicial, dataFinal };
  }

  return {
    dataInicial: dataFinal,
    dataFinal: dataInicial,
  };
}
