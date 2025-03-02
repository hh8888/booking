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
          onClick={() => setIsSignUp(false)}
          className={`py-2 px-4 ${!isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          className={`py-2 px-4 ${isSignUp ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
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
        />
      ) : (
        <SignInForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
        />
      )}

      {/* Sign Up/Sign In Button */}
      <button
        onClick={isSignUp ? onSignUp : onSignIn}
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200 mt-6"
      >
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </button>
    </div>
  );
}