import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SignUpForm({
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  postCode,
  setPostCode,
  birthday,
  setBirthday,
  gender,
  setGender,
  mobile,
  setMobile,
  authMethod,
  isMobileAuthEnabled
}) {
  const { t } = useLanguage();

  return (
    <>
      {/* Name Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.signUp.name')}<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder={t('auth.signUp.enterName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Email Input - Conditionally render based on authMethod */}
      {authMethod === 'email' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.signUp.email')}<span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder={t('auth.signUp.enterEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Mobile Input for Phone Authentication - Conditionally render based on authMethod and isMobileAuthEnabled */}
      {authMethod === 'phone' && isMobileAuthEnabled && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.signUp.mobile')}<span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder={t('auth.signUp.enterMobile')}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Password Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.signUp.password')}<span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          placeholder={t('auth.signUp.enterPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Phone Number Input - Always visible and required for profile data */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.signUp.phoneNumber')}<span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          placeholder={t('auth.signUp.enterPhone')}
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Post Code Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.signUp.postCode')}
        </label>
        <input
          type="text"
          placeholder={t('auth.signUp.enterPostCode')}
          value={postCode}
          onChange={(e) => setPostCode(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Birthday Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.signUp.birthday')}
        </label>
        <div className="relative">
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            placeholder={t('auth.signUp.birthdayPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onFocus={(e) => {
              // On mobile devices, temporarily change to text input for manual entry
              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                e.target.type = 'text';
                e.target.placeholder = t('auth.signUp.birthdayPlaceholder');
              }
            }}
            onBlur={(e) => {
              // Change back to date type when focus is lost
              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                e.target.type = 'date';
                e.target.placeholder = '';
              }
            }}
          />
        </div>
      </div>

      {/* Gender Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.signUp.gender')}
        </label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('auth.signUp.selectGender')}</option>
          <option value="Male">{t('auth.signUp.male')}</option>
          <option value="Female">{t('auth.signUp.female')}</option>
          <option value="Other">{t('auth.signUp.other')}</option>
        </select>
      </div>
    </>
  );
}