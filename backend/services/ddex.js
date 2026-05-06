import crypto from 'crypto';

/**
 * DDEX ERN (Electronic Release Notification) 4.1 Generator
 * Standard industri musik internasional untuk pengiriman rilisan ke DSP
 * (Spotify, Apple Music, Tidal, Amazon Music, dll)
 *
 * Referensi: https://ddex.net/intellectual-property/ern/
 * Disba Music — Indonesia's Music Aggregator
 */
class DDEXService {
  constructor() {
    this.senderPartyId = process.env.DDEX_SENDER_PARTY_ID || 'DISBAMUSIC';
    this.senderName = process.env.DDEX_SENDER_NAME || 'PT Disba Music Indonesia';
    this.dpidPrefix = process.env.DDEX_DPID || 'PADPIDA2026051001A';
  }

  /**
   * Generate DDEX ERN 4.1 XML untuk sebuah rilisan
   * @param {Object} release - Data release dari database
   * @param {Object} profile - Data artist dari database
   * @param {string[]} platforms - Target platforms ['spotify', 'apple_music', etc.]
   * @returns {string} - DDEX ERN 4.1 XML string
   */
  generateERN(release, profile, platforms = ['spotify']) {
    const messageId = `DISBA-${release.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const releaseDate = release.release_date
      ? new Date(release.release_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const artistName = profile.artist_stage_name || profile.full_name || 'Unknown Artist';
    const labelName = release.label || profile.label_name || 'Disba Music';
    const copyrightYear = release.copyright_year || new Date().getFullYear();
    const copyrightHolder = release.copyright_holder || artistName;
    const isExplicit = release.explicit_lyrics ? 'Explicit' : 'NotExplicit';
    const language = release.language || 'id';
    const ddexLanguage = language === 'id' ? 'ind' : language;

    const dsps = this._mapPlatformsToDSP(platforms);

    return `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage
  xmlns:ern="http://ddex.net/xml/ern/43"
  xmlns:avs="http://ddex.net/xml/avs/avs"
  LanguageAndScriptCode="en"
  MessageSchemaVersionId="ern/43">

  <MessageHeader>
    <MessageThreadId>${messageId}</MessageThreadId>
    <MessageId>${messageId}</MessageId>
    <MessageSender>
      <PartyId>${this.dpidPrefix}</PartyId>
      <PartyName>
        <FullName>${this._escapeXml(this.senderName)}</FullName>
      </PartyName>
    </MessageSender>
    ${dsps.map(dsp => `<MessageRecipient>
      <PartyId>${dsp.partyId}</PartyId>
      <PartyName>
        <FullName>${dsp.name}</FullName>
      </PartyName>
    </MessageRecipient>`).join('\n    ')}
    <MessageCreatedDateTime>${timestamp}</MessageCreatedDateTime>
    <MessageControlType>LiveMessage</MessageControlType>
  </MessageHeader>

  <UpdateIndicator>OriginalMessage</UpdateIndicator>

  <ResourceList>
    <SoundRecording>
      <SoundRecordingType>MusicalWorkSoundRecording</SoundRecordingType>
      <Isrc>${this._escapeXml(release.isrc)}</Isrc>
      <ReferenceTitle>
        <TitleText>${this._escapeXml(release.title)}</TitleText>
      </ReferenceTitle>
      <DisplayTitle LanguageAndScriptCode="${ddexLanguage}">
        <TitleText>${this._escapeXml(release.title)}</TitleText>
      </DisplayTitle>
      <Duration>PT3M30S</Duration>
      <SoundRecordingDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <DisplayArtist SequenceNumber="1">
          <PartyName>
            <FullName>${this._escapeXml(artistName)}</FullName>
          </PartyName>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>
        <ParentalWarningType>${isExplicit}</ParentalWarningType>
        <TechnicalSoundRecordingDetails>
          <TechnicalResourceDetailsReference>A1</TechnicalResourceDetailsReference>
          <AudioCodecType>FLAC</AudioCodecType>
          <BitRate UnitOfMeasure="Kbps">1411</BitRate>
          <SamplingRate UnitOfMeasure="kHz">44.1</SamplingRate>
          <BitsPerSample>16</BitsPerSample>
          <File>
            <URI>${this._escapeXml(release.audio_url)}</URI>
          </File>
        </TechnicalSoundRecordingDetails>
        <PLine>
          <Year>${copyrightYear}</Year>
          <PLineText>&#x2117; ${copyrightYear} ${this._escapeXml(copyrightHolder)}</PLineText>
        </PLine>
        <CLine>
          <Year>${copyrightYear}</Year>
          <CLineText>&#xa9; ${copyrightYear} ${this._escapeXml(labelName)}</CLineText>
        </CLine>
      </SoundRecordingDetailsByTerritory>
    </SoundRecording>

    <Image>
      <ImageType>FrontCoverImage</ImageType>
      <ReferenceTitle>
        <TitleText>${this._escapeXml(release.title)} - Cover</TitleText>
      </ReferenceTitle>
      <ImageDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <TechnicalImageDetails>
          <ImageCodecType>JPEG</ImageCodecType>
          <File>
            <URI>${this._escapeXml(release.cover_url)}</URI>
          </File>
        </TechnicalImageDetails>
      </ImageDetailsByTerritory>
    </Image>
  </ResourceList>

  <ReleaseList>
    <Release IsMainRelease="true">
      <ReleaseId>
        <GRid>A1${this._generateGRid(release.id)}</GRid>
        <ICPN>${this._escapeXml(release.upc || '')}</ICPN>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>${this._escapeXml(release.title)}</TitleText>
      </ReferenceTitle>
      <DisplayTitle LanguageAndScriptCode="${ddexLanguage}">
        <TitleText>${this._escapeXml(release.title)}</TitleText>
      </DisplayTitle>
      <ReleaseType>Single</ReleaseType>
      <ReleaseDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <DisplayArtistName>${this._escapeXml(artistName)}</DisplayArtistName>
        <DisplayArtist SequenceNumber="1">
          <PartyName>
            <FullName>${this._escapeXml(artistName)}</FullName>
          </PartyName>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>
        <LabelName>${this._escapeXml(labelName)}</LabelName>
        <Genre>
          <GenreText>${this._escapeXml(release.genre || 'Pop')}</GenreText>
        </Genre>
        <ParentalWarningType>${isExplicit}</ParentalWarningType>
        <RelatedRelease>
          <ReleaseRelationshipType>IsPartOfRelease</ReleaseRelationshipType>
        </RelatedRelease>
        <ResourceGroup>
          <ResourceGroupContentItem>
            <SequenceNumber>1</SequenceNumber>
            <ResourceType>SoundRecording</ResourceType>
            <ReleaseResourceReference>A1</ReleaseResourceReference>
          </ResourceGroupContentItem>
        </ResourceGroup>
        <PLine>
          <Year>${copyrightYear}</Year>
          <PLineText>&#x2117; ${copyrightYear} ${this._escapeXml(copyrightHolder)}</PLineText>
        </PLine>
        <CLine>
          <Year>${copyrightYear}</Year>
          <CLineText>&#xa9; ${copyrightYear} ${this._escapeXml(labelName)}</CLineText>
        </CLine>
      </ReleaseDetailsByTerritory>
    </Release>
  </ReleaseList>

  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R0</DealReleaseReference>
      <Deal>
        <DealTerms>
          <CommercialModelType>SubscriptionModel</CommercialModelType>
          <Usage>
            <UseType>OnDemandStream</UseType>
            <UseType>PermanentDownload</UseType>
          </Usage>
          <TerritoryCode>Worldwide</TerritoryCode>
          <ValidityPeriod>
            <StartDate>${releaseDate}</StartDate>
          </ValidityPeriod>
        </DealTerms>
      </Deal>
    </ReleaseDeal>
  </DealList>

</ern:NewReleaseMessage>`;
  }

  /**
   * Validasi metadata release sebelum generate DDEX
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateMetadata(release, profile) {
    const errors = [];

    if (!release.title?.trim()) errors.push('Judul lagu wajib diisi');
    if (!release.isrc?.trim()) errors.push('ISRC wajib ada (auto-generated)');
    if (!release.upc?.trim()) errors.push('UPC wajib ada (auto-generated)');
    if (!release.audio_url?.trim()) errors.push('URL audio wajib diisi');
    if (!release.cover_url?.trim()) errors.push('Cover artwork wajib diisi');
    if (!release.genre?.trim()) errors.push('Genre wajib dipilih');

    if (release.isrc && !this._validateISRC(release.isrc)) {
      errors.push(`ISRC format tidak valid: ${release.isrc}. Format: CC-XXX-YY-NNNNN`);
    }

    if (release.upc && !this._validateUPC(release.upc)) {
      errors.push(`UPC format tidak valid: ${release.upc}. Harus 12 digit angka`);
    }

    const artistName = profile?.artist_stage_name || profile?.full_name;
    if (!artistName?.trim()) errors.push('Nama artist wajib diisi di profil');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Map platform names ke DDEX party IDs resmi
   */
  _mapPlatformsToDSP(platforms) {
    const DSP_MAP = {
      spotify: { partyId: 'PADPIDA2009121001A', name: 'Spotify AB' },
      apple_music: { partyId: 'PADPIDA2009121101A', name: 'Apple Inc.' },
      youtube_music: { partyId: 'PADPIDA2006081601A', name: 'YouTube LLC' },
      tidal: { partyId: 'PADPIDA2014010101A', name: 'TIDAL Music AS' },
      amazon_music: { partyId: 'PADPIDA2004020901A', name: 'Amazon.com Services LLC' },
      deezer: { partyId: 'PADPIDA2009040901A', name: 'Deezer SA' },
      joox: { partyId: 'PADPIDA2015061601A', name: 'Tencent Music Entertainment' },
      resso: { partyId: 'PADPIDA2020010101A', name: 'TikTok Music Ltd' },
    };

    return platforms
      .map(p => DSP_MAP[p.toLowerCase()])
      .filter(Boolean);
  }

  /**
   * Generate GRid (Global Release Identifier) dari release UUID
   */
  _generateGRid(releaseId) {
    const hash = crypto.createHash('md5').update(releaseId).digest('hex');
    return hash.slice(0, 16).toUpperCase();
  }

  /**
   * Validate ISRC format: CC-XXX-YY-NNNNN
   */
  _validateISRC(isrc) {
    return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc.replace(/-/g, ''));
  }

  /**
   * Validate UPC (12 digit, check digit valid)
   */
  _validateUPC(upc) {
    if (!/^\d{12}$/.test(upc)) return false;
    const digits = upc.split('').map(Number);
    const checkDigit = digits.pop();
    const sum = digits.reduce((acc, d, i) => acc + (i % 2 === 0 ? d : d * 3), 0);
    return (10 - (sum % 10)) % 10 === checkDigit;
  }

  /**
   * Escape karakter XML
   */
  _escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate DDEX Takedown message (untuk remove dari DSP)
   */
  generateTakedown(release, platforms = ['spotify']) {
    const messageId = `TAKEDOWN-DISBA-${release.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const dsps = this._mapPlatformsToDSP(platforms);

    return `<?xml version="1.0" encoding="UTF-8"?>
<ern:PurgeReleaseMessage
  xmlns:ern="http://ddex.net/xml/ern/43"
  LanguageAndScriptCode="en"
  MessageSchemaVersionId="ern/43">
  <MessageHeader>
    <MessageThreadId>${messageId}</MessageThreadId>
    <MessageId>${messageId}</MessageId>
    <MessageSender>
      <PartyId>${this.dpidPrefix}</PartyId>
      <PartyName><FullName>${this._escapeXml(this.senderName)}</FullName></PartyName>
    </MessageSender>
    ${dsps.map(dsp => `<MessageRecipient>
      <PartyId>${dsp.partyId}</PartyId>
    </MessageRecipient>`).join('\n    ')}
    <MessageCreatedDateTime>${timestamp}</MessageCreatedDateTime>
  </MessageHeader>
  <PurgedRelease>
    <ReleaseId>
      <ISRC>${this._escapeXml(release.isrc)}</ISRC>
    </ReleaseId>
  </PurgedRelease>
</ern:PurgeReleaseMessage>`;
  }
}

export default new DDEXService();
