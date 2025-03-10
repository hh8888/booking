import React from 'react';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

export default function AuthForm({
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  postCode,
  setPostCode,
  birthday,
  setBirthday,
  gender,
  setGender,
  onSignIn,
  onSignUp,
  isLoading
}) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Service Booking
      </h1>

      {/* Toggle between Sign Up and Sign In */}
      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => !isLoading && setIsSignUp(false)}
          disabled={isLoading}
          className={`py-2 px-4 ${!isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Sign In
        </button>
        <button
          onClick={() => !isLoading && setIsSignUp(true)}
          disabled={isLoading}
          className={`py-2 px-4 ${isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Sign Up
        </button>
      </div>

      {/* Render SignInForm or SignUpForm */}
      {isSignUp ? (
        <SignUpForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          postCode={postCode}
          setPostCode={setPostCode}
          birthday={birthday}
          setBirthday={setBirthday}
          gender={gender}
          setGender={setGender}
          isLoading={isLoading}
        />
      ) : (
        <SignInForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isLoading={isLoading}
        />
      )}

      {/* Sign Up/Sign In Button */}
      <button
        onClick={isSignUp ? onSignUp : onSignIn}
        disabled={isLoading}
        className={`w-full bg-blue-500 text-white py-2 rounded-lg transition duration-200 mt-6 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
            {isSignUp ? 'Signing Up...' : 'Signing In...'}
          </div>
        ) : (
          isSignUp ? 'Sign Up' : 'Sign In'
        )}
      </button>
    </div>
  );
}