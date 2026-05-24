"use server";

/**
 * POLANITAS — Page-Aware AI Assistant (Voice)
 */

import { getGeneralClient, GROQ_MODEL } from "@/lib/groq-client";
import { isQuestion as _isQuestion } from "@/lib/speech-utils";

// ── Page context definitions ──────────────────────────────────────────────────
const PAGE_CONTEXTS: Record<string, string> = {
  "/dashboard": `
Ini adalah halaman Dashboard utama POLANITAS.
Di sini user bisa melihat statistik belajar mereka (jumlah modul tersedia, modul yang sedang berjalan, dan status AI Tutor Lab).
User bisa mencari modul lewat kolom pencarian, memfilter berdasarkan level (Fundamental, Menengah, Lanjutan, Populer, Terbaru), dan membuka modul apa pun dari carousel horizontal.
Di panel kanan ada daftar modul yang sedang aktif beserta progress belajar, promo banner untuk melihat kurikulum lengkap, dan tombol untuk memulai Simulasi Agen AI.
Total tersedia 12 modul pembelajaran.
  `.trim(),

  "/dashboard/learn": `
Ini adalah halaman Kurikulum / Materi POLANITAS.
Semua 12 modul pembelajaran tersedia di sini:
1. Orkestrasi AI — Menjadi dirigen jaringan agen (Fundamental)
2. Deteksi Tren Dini — Sinyal tren TikTok sebelum viral (Menengah)
3. Whitespace Marketplace — Celah pasar Shopee & Tokopedia (Menengah)
4. Eye Tracking Mastery — F-Pattern, WebGazer, Heatmap (Lanjutan)
5. Copywriting LLM — 1.000 variasi caption via Llama 3 (Menengah)
6. Content Atomization — 1 ide menjadi Reels, TikTok, Live (Menengah)
7. Neuromarketing — Dashboard keputusan 30 detik (Lanjutan)
8. Manajemen Krisis — Respon sentimen otomatis (Lanjutan)
9. Atribusi ROI — Engagement ke sales marketplace (Lanjutan)
10. Etika AI & Brand Safety — Guardrails, UU PDP, Compliance (Fundamental)
11. Influencer DNA Matching — Vibe matching dengan vector search (Lanjutan)
12. A/B Testing Agresif — 50 variasi iklan, iterasi otomatis (Lanjutan)
User bisa membuka modul mana saja dengan menyebut nomornya.
  `.trim(),

  "/dashboard/sessions": `
Ini adalah halaman Sesi Riset POLANITAS.
Di sini user bisa memulai sesi riset baru menggunakan 3 AI Agent (Researcher, Strategist, Analyst).
User perlu mengisi: topik atau produk yang ingin diriset, memilih platform (TikTok, YouTube, Instagram, Shopee, Tokopedia), memilih fokus riset (Tren Konten, Whitespace Produk, Analisis Kompetitor, Strategi Hashtag, atau Segmentasi Audiens), memilih region (Indonesia, Malaysia, Singapura, Amerika), dan opsional mengisi deskripsi target audiens.
Setelah memulai, tiga agen AI akan berjalan secara berurutan dan hasilnya bisa dipantau secara real-time.
Di bawah form ada riwayat semua sesi riset sebelumnya.
  `.trim(),

  "/dashboard/heatmaps": `
Ini adalah halaman Heatmap Eye Tracking POLANITAS.
Di sini user bisa melihat visualisasi heatmap dari data eye tracking yang dikumpulkan selama sesi riset.
Heatmap menunjukkan area mana yang paling banyak dilihat oleh audiens saat membaca konten.
  `.trim(),

  "/dashboard/researcher": `
Ini adalah halaman Researcher Agent.
Agent Researcher bertugas mengumpulkan data tren, sinyal pasar, dan informasi kompetitor sesuai topik yang diberikan.
Hasilnya menjadi input untuk Agent Strategist.
  `.trim(),

  "/dashboard/strategist": `
Ini adalah halaman Strategist Agent.
Agent Strategist mengolah hasil riset dari Researcher dan merancang strategi konten yang optimal — termasuk pilihan format, jadwal posting, dan angle pemasaran.
Hasilnya diteruskan ke Agent Analyst untuk evaluasi akhir.
  `.trim(),

  "/dashboard/analyst": `
Ini adalah halaman Analyst Agent.
Agent Analyst mensintesis data dari Researcher dan Strategist, lalu melakukan evaluasi mendalam menggunakan simulasi heatmap visual.
Hasilnya adalah laporan komprehensif berisi rekomendasi konten berbasis data.
  `.trim(),

  "/dashboard/reports": `
Ini adalah halaman Laporan.
Di sini tersimpan semua laporan hasil analisis dari sesi riset yang sudah selesai.
User bisa mereview hasil kerja tiga AI Agent dalam format yang terstruktur.
  `.trim(),

  // ── Module contexts ──────────────────────────────────────────────────────
  "/dashboard/learn/ai-orchestration": `
Ini adalah Modul 1: Orkestrasi AI — Menjadi Dirigen Jaringan Agen.
Level: Fundamental. Terdiri dari 6 materi utama:
1. Apa itu AI Orchestration? — Menjelaskan perubahan paradigma dari pekerja eksekusi menjadi dirigen (konduktor) yang mengawasi jaringan agen.
2. Anatomi Pipeline — Menjelaskan 3 lapisan sistem: Layer Orchestrator (User), Layer Agent (Researcher, Strategist, Analyst), dan Layer Tool (API, Groq, WebGazer).
3. Dekomposisi Tujuan Bisnis — Cara memecah tujuan besar (KPI) menjadi instruksi mikro yang bisa dimengerti AI menggunakan teknik OKR.
4. Quality Gate & Human Oversight — Menjelaskan kapan manusia harus mengintervensi (keputusan high-stakes, hukum, reputasi) dan kapan bisa otomatis penuh.
5. Studi Kasus: Kampanye 48 Jam — Contoh nyata peluncuran produk sunscreen Luminara Beauty menggunakan pipeline 3 agen dalam waktu singkat.
6. Merancang SOP Orkestrasi — Cara membangun Standard Operating Procedure agar sistem bisa direplikasi dan diskalakan oleh tim.
User bisa bertanya detail tentang salah satu dari 6 materi di atas.
  `.trim(),

  "/dashboard/learn/trend-signal": `
Ini adalah Modul 2: Deteksi Tren Dini — Sinyal Tren TikTok Sebelum Viral.
Level: Menengah. Terdiri dari 6 pelajaran, estimasi 2,5 jam.
Topik yang dibahas:
- Cara kerja algoritma TikTok dalam mendistribusikan konten
- Membedakan noise dari sinyal tren yang nyata
- Tool dan teknik: social listening, hashtag velocity, engagement rate analysis
- Menggunakan AI untuk memproses data tren secara massal
- Identifikasi micro-trend sebelum mencapai puncak viral
- Membangun sistem alert tren otomatis
  `.trim(),

  "/dashboard/learn/marketplace-whitespace": `
Ini adalah Modul 3: Whitespace Marketplace — Celah Pasar Shopee & Tokopedia.
Level: Menengah. Terdiri dari 5 pelajaran, estimasi 2 jam.
Topik yang dibahas:
- Apa itu whitespace dan mengapa penting untuk seller
- Analisis gap antara demand konsumen dan supply produk
- Teknik riset keyword dengan volume tinggi tapi kompetisi rendah
- Membaca data penjualan dan review untuk menemukan peluang
- Strategi masuk ke celah pasar yang ditemukan
  `.trim(),

  "/dashboard/learn/eye-tracking": `
Ini adalah Modul 4: Eye Tracking Mastery — F-Pattern, WebGazer, Heatmap.
Level: Lanjutan. Terdiri dari 9 pelajaran, estimasi 4 jam.
Topik yang dibahas:
- Psikologi visual: bagaimana mata manusia membaca konten
- F-Pattern dan Z-Pattern dalam desain konten
- Implementasi WebGazer.js untuk eye tracking berbasis browser
- Mengumpulkan dan memvisualisasikan data gaze points
- Menganalisis heatmap untuk mengoptimalkan tata letak konten
- Mengintegrasikan data eye tracking dengan analisis engagement
  `.trim(),

  "/dashboard/learn/llm-copywriting": `
Ini adalah Modul 5: Copywriting LLM — 1.000 Variasi Caption via Llama 3.
Level: Menengah. Terdiri dari 4 pelajaran utama:
1. Arsitektur Prompt untuk Copywriting — Menjelaskan framework CRISP untuk prompt copywriting yang konsisten.
2. Personalisasi per Segmen Audiens — Cara membuat variasi pesan per segmen tanpa mengubah brand voice.
3. Viral Hook Engineering — Rumus Hook kali CTA kali Urgency untuk memicu interaksi.
4. Quality Control Output LLM — Framework QC 4-Layer (Fakta, Brand, Legal, A/B) agar konten Publishing-Ready.
  `.trim(),

  "/dashboard/learn/content-atomization": `
Ini adalah Modul 6: Content Atomization — Memecah Satu Ide Menjadi Puluhan Format.
Level: Menengah. Terdiri dari 4 pelajaran utama:
1. Prinsip Content Atomization — Cara memecah ide besar menjadi format micro-content.
2. Satu Ide menjadi Puluhan Format — Teknik repurposing konten ke multi-platform.
3. Platform-Native Adaptation — Menyesuaikan vibe konten agar cocok dengan algoritma TikTok, Reels, dan YouTube Shorts.
4. Workflow Atomisasi dengan AI — Menggunakan agen AI untuk mengotomatiskan seluruh alur kerja repurposing.
  `.trim(),

  "/dashboard/learn/neuromarketing": `
Ini adalah Modul 7: Neuromarketing — Desain Analitik untuk Keputusan 30 Detik.
Level: Lanjutan. Terdiri dari 4 pelajaran utama:
1. Beban Kognitif & Keputusan — Cara meminimalkan beban kognitif agar user bisa mengambil keputusan dengan cepat.
2. Psikologi Warna dalam Marketing — Memahami korelasi emosi warna terhadap perilaku pembelian konsumen.
3. Desain Dashboard yang Efektif — Prinsip kegunaan visual untuk menyajikan metrik penting.
4. Nudge Theory untuk Konversi — Taktik psikologis halus untuk meningkatkan tingkat konversi landing page.
  `.trim(),

  "/dashboard/learn/crisis-management": `
Ini adalah Modul 8: Manajemen Krisis — Respon Sentimen Otomatis.
Level: Lanjutan. Terdiri dari 4 pelajaran utama:
1. Anatomi Krisis Digital — Memahami asal-usul krisis di media sosial dan siklus hidupnya.
2. Deteksi Sentimen Real-Time — Menggunakan AI untuk mengidentifikasi sentimen negatif sejak awal.
3. Framework Respons Empati — Cara menyusun balasan humas yang empatik dan meredam ketegangan secara otomatis.
4. Post-Crisis Recovery — Strategi memulihkan citra brand pasca kontroversi berdasarkan data historis.
  `.trim(),

  "/dashboard/learn/roi-attribution": `
Ini adalah Modul 9: Atribusi ROI — Engagement ke Sales Marketplace.
Level: Lanjutan. Terdiri dari 4 pelajaran utama:
1. Engagement ke Revenue — Cara melacak dampak suka, komentar, dan bagikan terhadap konversi penjualan riil.
2. Model Atribusi — Perbandingan model atribusi First-Click, Last-Click, Linear, dan berbasis data.
3. ROAS & Customer Lifetime Value — Mengukur keekonomian iklan secara akurat.
4. Dashboard Atribusi untuk Tim — Mendesain visualisasi data kontribusi saluran pemasaran agar mudah dimengerti tim.
  `.trim(),

  "/dashboard/learn/ai-ethics": `
Ini adalah Modul 10: Etika AI & Brand Safety.
Level: Fundamental. Terdiri dari 4 pelajaran utama:
1. Kenapa Etika AI Penting — Menjaga kepercayaan audiens dan integritas reputasi brand.
2. Guardrails & Content Filtering — Sistem penyaringan kata dan pengaman konten hasil generasi AI.
3. UU PDP & Compliance Digital — Kepatuhan hukum perlindungan data pribadi dalam pemrosesan data oleh AI.
4. Framework Governance AI — Struktur kebijakan internal perusahaan untuk penggunaan AI yang aman.
  `.trim(),

  "/dashboard/learn/influencer-dna": `
Ini adalah Modul 11: Influencer DNA Matching — Vibe Matching dengan Vector Search.
Level: Lanjutan. Terdiri dari 4 pelajaran utama:
1. Evolusi Influencer Marketing — Dari jangkauan massal ke keselarasan nilai (niche values).
2. Vector Search & Semantic Matching — Memahami representasi numerik video untuk pencocokan kemiripan.
3. DNA Matching: Vibe, Audiens, Values — Algoritma mencocokkan kepribadian influencer dengan citra brand.
4. Kalkulasi ROI Kolaborasi — Cara memprediksi ROI sebelum menandatangani kontrak kerja sama.
  `.trim(),

  "/dashboard/learn/ab-testing": `
Ini adalah Modul 12: A/B Testing Agresif — 50 Variasi Iklan, Iterasi Otomatis.
Level: Lanjutan. Terdiri dari 4 pelajaran utama:
1. A/B Testing Tradisional Lambat — Kelemahan pendekatan split-test lama yang memakan waktu berminggu-minggu.
2. Multi-Armed Bandit vs A/B — Efisiensi algoritma alokasi traffic real-time untuk iklan berkinerja terbaik.
3. AI-Driven Creative Iteration — Iterasi otomatis teks dan visual iklan menggunakan AI generatif.
4. Statistical Significance & Decision — Menghitung signifikansi statistik agar keputusan didukung data ilmiah.
  `.trim(),

  "/dashboard/learn/statistika-dasar": `
Ini adalah Modul 13: Statistika Dasar — Konsep Fundamental Pengolahan Data.
Level: Fundamental. Terdiri dari 6 pelajaran utama:
1. Mean (Rata-rata) — Cara menghitung nilai rata-rata kelompok data dan kegunaannya.
2. Median (Nilai Tengah) — Mengidentifikasi nilai tengah untuk menepis bias dari nilai ekstrem.
3. Standar Deviasi — Mengukur tingkat persebaran data untuk melihat konsistensi performa.
4. Distribusi Data & Histogram — Membaca bentuk visual kurva distribusi data.
5. Korelasi & Hubungan Antar Variabel — Memahami hubungan timbal balik antar metrik pemasaran.
6. Outlier & Deteksi Anomali — Cara menemukan anomali data pemasaran yang mencurigakan.
  `.trim(),
};

// (isQuestion is exported from @/lib/speech-utils for client-side use)
export async function askAboutPage(
  pathname: string,
  question: string,
  history: { role: 'user' | 'assistant', content: string }[] = []
): Promise<{ answer: string }> {
  // Find the most specific matching context
  const context =
    PAGE_CONTEXTS[pathname] ??
    // Try prefix match (e.g. /dashboard/sessions/[id])
    Object.entries(PAGE_CONTEXTS).find(([key]) => pathname.startsWith(key))?.[1] ??
    "Halaman ini adalah bagian dari platform POLANITAS untuk edukasi Data Analyst.";

  const groq = getGeneralClient();

  const GLOBAL_MODULES = `
DAFTAR LENGKAP 13 MODUL KURIKULUM POLANITAS:
1. Orkestrasi AI — Menjadi dirigen jaringan agen (Fundamental)
2. Deteksi Tren Dini — Sinyal tren TikTok sebelum viral (Menengah)
3. Whitespace Marketplace — Celah pasar Shopee & Tokopedia (Menengah)
4. Eye Tracking Mastery — F-Pattern, WebGazer, Heatmap (Lanjutan)
5. Copywriting LLM — 1.000 variasi caption via Llama 3 (Menengah)
6. Content Atomization — 1 ide menjadi Reels, TikTok, Live (Menengah)
7. Neuromarketing — Dashboard keputusan 30 detik (Lanjutan)
8. Manajemen Krisis — Respon sentimen otomatis (Lanjutan)
9. Atribusi ROI — Engagement ke sales marketplace (Lanjutan)
10. Etika AI & Brand Safety — Guardrails, UU PDP, Compliance (Fundamental)
11. Influencer DNA Matching — Vibe matching dengan vector search (Lanjutan)
12. A/B Testing Agresif — 50 variasi iklan, iterasi otomatis (Lanjutan)
13. Statistika Dasar — Konsep fundamental pengolahan data (Fundamental)
  `.trim();

  const systemPrompt = `
Kamu adalah asisten suara POLANITAS, platform edukasi Data Analyst berbasis AI Agent.
Tugasmu adalah menjawab pertanyaan user tentang konten halaman saat ini dan modul-modul yang ada, serta menjelaskan arti dari istilah yang ditanyakan user.

ATURAN PENTING:
- PENTING: Pengguna fitur ini adalah seorang TUNANETRA yang tidak dapat melihat layar sama sekali. Kamu harus menjadi "mata" bagi mereka.
- Jelaskan posisi, struktur, dan konteks halaman secara deskriptif agar mereka bisa membayangkan tata letaknya.
- Jawab dalam Bahasa Indonesia yang natural, bersahabat, dan jelas.
- User mengandalkan pendengaran, jadi buat jawaban seringkas mungkin tapi tetap deskriptif dan bermakna (maksimal 4-5 kalimat).
- Jangan gunakan bullet points, markdown, atau format yang tidak natural diucapkan (ucapkan koma dan titik seperti bicara biasa).
- Jika pertanyaan tentang modul, sebutkan nama modul dari DAFTAR LENGKAP di bawah dan jelaskan topiknya secara conversational.
- Jika ditanya "modul apa yang pertama", jawablah "Modul pertama adalah Orkestrasi AI", dst.
- Jika user minta "ajarkan", mulai dengan topik pertama dan tawarkan untuk lanjut.
- Jika user bertanya arti atau maksud suatu istilah, jelaskan dengan bahasa sederhana dan beri contoh singkat.
- Ingat konteks obrolan sebelumnya untuk menjawab pertanyaan lanjutan seperti "terus apa bedanya?".

KONTEKS HALAMAN SAAT INI (Fokus Utama Jika User Bertanya "Halaman ini tentang apa?"):
${context}

${GLOBAL_MODULES}
  `.trim();

  // Convert history to Groq chat messages
  const historyMessages = history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.6,
    max_tokens: 300,
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages as any,
      { role: "user", content: question },
    ],
  });

  const answer = response.choices[0]?.message?.content ?? "Maaf, saya tidak bisa menjawab saat ini.";
  return { answer };
}
