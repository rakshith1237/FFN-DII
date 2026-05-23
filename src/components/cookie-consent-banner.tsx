'use client'

import { useEffect } from 'react'
import 'vanilla-cookieconsent/dist/cookieconsent.css'
import * as CookieConsent from 'vanilla-cookieconsent'

export default function CookieConsentBanner() {
  useEffect(() => {
    CookieConsent.run({
      guiOptions: {
        consentModal: {
          layout:       'box',
          position:     'bottom right',
          equalWeightButtons: false,
          flipButtons:  false,
        },
        preferencesModal: {
          layout: 'box',
        },
      },

      categories: {
        necessary: {
          enabled:  true,
          readOnly: true,
        },
        analytics: {
          enabled:       false,
          readOnly:      false,
          autoClear: {
            cookies: [
              { name: /^(_ga|_gid|_gat)/ },
            ],
          },
        },
      },

      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title:       'We use cookies',
              description: 'FFN uses cookies to maintain your session (essential) and improve the platform (analytics). Essential cookies cannot be disabled as they are required for the platform to function.',
              acceptAllBtn:      'Accept All',
              acceptNecessaryBtn: 'Reject All',
              showPreferencesBtn: 'Manage Preferences',
              footer: '<a href="/privacy">Privacy Policy</a>',
            },
            preferencesModal: {
              title: 'Cookie Preferences',
              acceptAllBtn:      'Accept All',
              acceptNecessaryBtn: 'Reject All',
              savePreferencesBtn: 'Save Preferences',
              closeIconLabel:    'Close',
              sections: [
                {
                  title:       'Essential Cookies',
                  description: 'These cookies are required for the platform to function. They maintain your session and authentication state. They cannot be disabled.',
                  linkedCategory: 'necessary',
                },
                {
                  title:       'Analytics Cookies',
                  description: 'These cookies help us understand how the platform is used so we can improve it. They are disabled by default.',
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
        },
      },
    })
  }, [])

  return null
}