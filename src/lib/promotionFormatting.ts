export const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export const formatPromotionDeadline = (value: string | Date) => new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
}).format(new Date(value)).replace('.', ':') + ' WIB';

export const getPromotionCountdown = (value: string | Date, now: number) => {
  if (!now) return 'Menghitung sisa waktu…';
  const difference = new Date(value).getTime() - now;
  if (difference <= 0) return 'Masa promosi telah berakhir';

  const totalHours = Math.floor(difference / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.max(1, Math.floor((difference % 3_600_000) / 60_000));

  if (days > 0) return `${days} hari ${hours} jam tersisa`;
  if (hours > 0) return `${hours} jam ${minutes} menit tersisa`;
  return `${minutes} menit tersisa`;
};
