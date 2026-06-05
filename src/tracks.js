// Pick the best caption track from a yt-dlp info dump.
//
// Manual captions are preferred over automatic ones, and English is preferred
// by default. A specific language can be requested to override the defaults.

export function supportsJson3(track) {
  return Array.isArray(track) && track.some((format) => format.ext === "json3");
}

export function availableLanguages(info) {
  return {
    manual: Object.keys(info.subtitles ?? {}),
    automatic: Object.keys(info.automatic_captions ?? {}),
  };
}

export function findTrack(info, type, lang) {
  const tracks = type === "manual" ? info.subtitles : info.automatic_captions;
  const track = tracks?.[lang];
  return supportsJson3(track) ? { lang, type } : undefined;
}

export function chooseTrack(info, preferredLang) {
  if (preferredLang) {
    const exactManual = findTrack(info, "manual", preferredLang);
    if (exactManual) return exactManual;

    const exactAutomatic = findTrack(info, "automatic", preferredLang);
    if (exactAutomatic) return exactAutomatic;
  }

  const manualPreferred = preferredLang ? [preferredLang] : ["en", "en-US", "en-GB", "en-orig"];
  const automaticPreferred = preferredLang ? [preferredLang] : ["en-orig", "en", "en-US", "en-GB"];

  for (const lang of manualPreferred) {
    const track = findTrack(info, "manual", lang);
    if (track) return track;
  }

  for (const lang of automaticPreferred) {
    const track = findTrack(info, "automatic", lang);
    if (track) return track;
  }

  const languages = availableLanguages(info);
  const englishManual = languages.manual.find((lang) => lang.startsWith("en") && findTrack(info, "manual", lang));
  if (englishManual) return { lang: englishManual, type: "manual" };

  const englishAutomatic = languages.automatic.find((lang) => lang.startsWith("en") && findTrack(info, "automatic", lang));
  if (englishAutomatic) return { lang: englishAutomatic, type: "automatic" };

  const manual = languages.manual.find((lang) => findTrack(info, "manual", lang));
  if (manual) return { lang: manual, type: "manual" };

  const automatic = languages.automatic.find((lang) => findTrack(info, "automatic", lang));
  if (automatic) return { lang: automatic, type: "automatic" };

  return undefined;
}
