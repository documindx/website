import { translations, type Locale, type TranslationKey } from './translations'

/** 从 URL 路径推断当前语言 */
export function getLocaleFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/')
  if (lang === 'en') return 'en'
  return 'zh'
}

/** 获取翻译函数 */
export function useTranslations(locale: Locale) {
  return function t(key: TranslationKey): string {
    return translations[locale][key] ?? translations.zh[key] ?? key
  }
}

/** 获取当前语言的 HTML lang 属性 */
export function getHtmlLang(locale: Locale): string {
  return locale === 'en' ? 'en' : 'zh-CN'
}

/** 获取切换语言的路径 */
export function getLocalePath(currentPath: string, targetLocale: Locale): string {
  // 去掉当前语言前缀
  const pathWithoutLocale = currentPath.replace(/^\/(en)\//, '/').replace(/^\/(en)$/, '/')

  if (targetLocale === 'zh') {
    return pathWithoutLocale || '/'
  }
  return `/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}` || '/en'
}
