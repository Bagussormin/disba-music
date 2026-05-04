# 🎵 DISBA Music - Multi-Platform Music Distribution Platform

DISBA Music adalah platform distribusi musik multi-platform yang menghubungkan artis Indonesia dengan pasar musik global. Kami mengambil komisi 15% dari setiap pendapatan yang dihasilkan, memberikan 85% kepada artis.

## ✨ Fitur Utama

### 🎯 **Multi-Platform Distribution**
- **Spotify** - Distribusi langsung dengan analytics real-time
- **TuneCore** - Aggregator luas ke ratusan store musik
- **Apple Music** - Distribusi ke iTunes dan Apple Music
- **Dan banyak lagi** - Platform berkembang terus

### 💰 **Monetisasi & Revenue Sharing**
- **Komisi DISBA**: 15% dari total revenue
- **Pembayaran Artis**: 85% langsung ke wallet
- **Payout Otomatis**: Setiap bulan tanpa biaya tambahan
- **Minimum Withdrawal**: Rp 50.000

### 📊 **Analytics & Tracking**
- Real-time streams tracking
- Revenue reports per platform
- Artist dashboard lengkap
- Commission transparency

### 🎨 **Artist Tools**
- Upload musik dengan mudah
- Metadata management
- Smart link generation
- Royalty splits untuk kolaborasi

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Distribution partner APIs

### Installation

1. **Clone repository**
```bash
git clone https://github.com/your-org/disba-music.git
cd disba-music
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm start
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install
npm run dev
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Distribution APIs
SPOTIFY_DISTRIBUTION_API_URL=...
SPOTIFY_DISTRIBUTION_API_KEY=...
TUNECORE_DISTRIBUTION_API_URL=...
TUNECORE_DISTRIBUTION_API_KEY=...
APPLE_MUSIC_DISTRIBUTION_API_URL=...
APPLE_MUSIC_DISTRIBUTION_API_KEY=...

# Webhook Secrets
SPOTIFY_WEBHOOK_SECRET=...
```

## 📈 Business Model

### Revenue Streams
1. **Distribution Commission**: 15% dari setiap track yang terdistribusi
2. **Premium Features**: Upload slots, priority distribution
3. **Enterprise Solutions**: Custom distribution packages

### Payout Process
1. Platform mengirim revenue data via webhook
2. Sistem menghitung komisi (15% DISBA, 85% artis)
3. Dana masuk ke wallet artis
4. Artis bisa withdraw kapan saja (min. Rp 50.000)

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Payments**: Bank transfer integration

## 📝 API Documentation

### Distribution Endpoints

#### Distribute Track
```http
POST /api/distribution/distribute
Authorization: Bearer {token}
Content-Type: application/json

{
  "releaseId": "uuid",
  "platforms": ["spotify", "tune_core", "apple_music"]
}
```

#### Get Distribution Status
```http
GET /api/distribution/status
Authorization: Bearer {token}
```

#### Wallet Operations
```http
GET /api/wallet/balance
POST /api/wallet/withdraw
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Website**: [disba-music.com](https://disba-music.com)
- **Email**: hello@disba-music.com
- **Support**: support@disba-music.com

---

**DISBA Music** - Connecting Indonesian artists to the world 🎵
