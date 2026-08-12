import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { saveBlob } from '../../lib/file-download';
export function usePdfDownload() { const toast = useToast(); const [pendingKey, setPendingKey] = useState<string | null>(null); const download = async (key: string, request: () => Promise<{ blob: Blob; filename: string }>) => { setPendingKey(key); try { const result = await request(); saveBlob(result.blob, result.filename); toast.success('PDF hazırlandı', 'Dosya indirildi.'); } catch { toast.error('PDF oluşturulamadı', 'Lütfen tekrar deneyin.'); } finally { setPendingKey(null); } }; return { download, pendingKey }; }
