"use server";

import { getGeneralClient, GROQ_MODEL } from "@/lib/groq-client";

export type FormIntentResponse = {
  isFormAction: boolean;
  action?: any; // The VoiceFormAction payload
  reply?: string; // Text to speak back to the user
};

export async function parseFormIntent(
  pathname: string,
  text: string
): Promise<FormIntentResponse> {
  const groq = getGeneralClient();

  const systemPrompt = `
Kamu adalah asisten suara POLANITAS yang membantu user mengisi form di halaman web.
Jika YA (perintah langsung untuk mengisi atau klik), kembalikan JSON dengan isFormAction: true.
Jika TIDAK (pertanyaan, curhatan, atau permintaan penjelasan), kembalikan JSON dengan isFormAction: false.

PENTING: Jika user bertanya menggunakan kata tanya (Apa, Bagaimana, Kenapa, Jelaskan, Ceritakan, Beritahu), maka itu BUKAN aksi form. Set isFormAction: false agar asisten bisa menjawab pertanyaan tersebut.
Contoh: "Buka materi 5" -> isFormAction: true. "Apa isi materi 5?" -> isFormAction: false.

Halaman saat ini: ${pathname}

DAFTAR AKSI FORM YANG DIDUKUNG UNTUK HALAMAN /dashboard/sessions:
1. set-topic: Mengisi input "Topik / Produk / Bisnis" (contoh: "isi topik jualan kopi susu")
2. set-audience: Mengisi input "Target Audiens" (contoh: "target audiensnya anak muda 20 tahun")
3. set-region: Mengubah dropdown Region. Kode yang valid: "ID" (Indonesia), "MY" (Malaysia), "SG" (Singapura), "US" (Amerika Serikat).
4. toggle-platform: Mencentang/uncentang platform. Platform yang valid: "tiktok", "youtube", "instagram", "shopee", "tokopedia".
5. set-focus: Mengubah Fokus Riset. ID valid: "trend-konten", "whitespace-produk", "analisis-kompetitor", "strategi-hashtag", "segmentasi-audiens".
6. submit-form: Mengklik tombol "Mulai Riset AI" / Submit form. (contoh: "mulai riset", "submit form ini")
7. set-lesson: Berpindah ke materi nomor tertentu. (contoh: "buka materi kedua", "materi ke 3"). Ubah kata bilangan ke index 0.
8. next-lesson: Berpindah ke materi/pelajaran berikutnya. (contoh: "materi selanjutnya", "berikutnya", "lanjut").
9. prev-lesson: Berpindah ke materi/pelajaran sebelumnya. (contoh: "materi sebelumnya", "kembali ke materi tadi").
10. read-lesson-details: Membaca lengkap isi materi/pelajaran yang sedang aktif. (contoh: "bacakan materi secara lengkap", "bacakan isi pelajaran", "bacakan isi modul secara lengkap", "baca lengkap").

FORMAT JSON OUTPUT YANG WAJIB DIIKUTI:
{
  "isFormAction": boolean,
  "action": {
    "type": "set-topic" | "set-audience" | "set-region" | "toggle-platform" | "set-focus" | "submit-form" | "set-lesson" | "next-lesson" | "prev-lesson" | "read-lesson-details",
    "value": string,
    "code": string,
    "platform": string,
    "focusId": string,
    "index": number
  },
  "reply": "Kalimat singkat untuk diucapkan ke user sebagai konfirmasi"
}

CONTOH 1: "tolong isi topiknya tentang skincare korea"
{"isFormAction": true, "action": {"type": "set-topic", "value": "skincare korea"}, "reply": "Mengisi topik dengan skincare korea."}

CONTOH 2: "pilih platform tiktok dan shopee" (Hanya bisa proses 1 per request, pilih yang pertama, atau biarkan sistem menangani. Karena format action hanya support 1 platform untuk toggle-platform, pilih salah satu atau jika butuh banyak pakai set-platforms. Untuk sekarang, support single action saja dulu)
{"isFormAction": true, "action": {"type": "toggle-platform", "platform": "tiktok"}, "reply": "Mengubah status platform TikTok."}

CONTOH 3: "bacakan isi pelajaran secara lengkap"
{"isFormAction": true, "action": {"type": "read-lesson-details"}, "reply": "Membacakan isi materi secara lengkap."}

CONTOH 4: "apa itu whitespace?"
{"isFormAction": false}

Output HANYA berupa JSON valid tanpa format markdown \`\`\`json.
  `.trim();

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { isFormAction: false };

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error("[Form Intent Parse Error]:", error);
    return { isFormAction: false };
  }
}
