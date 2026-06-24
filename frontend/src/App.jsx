import './App.css'
import { SignedIn, SignedOut, SignInButton, SignOutButton, SignUpButton, UserButton } from '@clerk/clerk-react'

function App() {
  return (
    <>
      <header>
        <SignedOut>
          <SignInButton mode='modal'/>
        </SignedOut>
        <SignedIn>
          <SignOutButton/>
          
        </SignedIn>
        <UserButton />
      </header>
    </>
  )
}

export default App