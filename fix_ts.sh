#!/bin/bash

# Fix LandingPage.tsx line 93 (lockoutTimer useEffect)
sed -i '92,102c\
  useEffect(() => {\
    if (lockoutTimer > 0) {\
      const timer = setTimeout(() => setLockoutTimer(prev => prev - 1), 1000);\
      return () => clearTimeout(timer);\
    } else if (lockoutTimer === 0 && isLockedOut) {\
      setIsLockedOut(false);\
      setAttemptsLeft(4);\
      setErrorMessage("");\
    }\
    return undefined;\
  }, [lockoutTimer, isLockedOut]);\
' artifacts/salon-platform/src/components/LandingPage.tsx

