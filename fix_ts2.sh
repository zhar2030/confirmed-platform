#!/bin/bash

# Fix LandingPage.tsx line 105 (activeNotification useEffect)
sed -i '105,115c\
  useEffect(() => {\
    if (activeNotification && activeNotification.visible) {\
      const timer = setTimeout(() => {\
        setActiveNotification(prev => prev ? { ...prev, visible: false } : null);\
      }, 9000);\
      return () => clearTimeout(timer);\
    }\
    return undefined;\
  }, [activeNotification]);\
' artifacts/salon-platform/src/components/LandingPage.tsx

# Fix activeNotification ? checks
sed -i 's/activeNotification\./activeNotification?./g' artifacts/salon-platform/src/components/LandingPage.tsx

# Fix SubscriptionPaymentGateway.tsx line 220
sed -i '220,246c\
  useEffect(() => {\
    if (step === "processing") {\
      const interval = setInterval(() => {\
        setSecureLogIndex(prev => {\
          if (prev >= secureLogs.length - 1) {\
            clearInterval(interval);\
            const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();\
            setExpectedOtp(randomOtp);\
            setStep("otp");\
            setOtpTimer(120);\
            return prev;\
          }\
          return prev + 1;\
        });\
      }, 1500);\
      return () => clearInterval(interval);\
    }\
    return undefined;\
  }, [step]);\
' artifacts/salon-platform/src/components/SubscriptionPaymentGateway.tsx
