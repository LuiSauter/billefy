package com.billefy.app.notification

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.billefy.shared.detector.FinancialNotificationDetector

class BillefyNotificationListenerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return

        // Ignore notifications from Billefy itself
        if (packageName == applicationContext.packageName) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()

        // Privacy Guard: evaluate strictly on-device using detector rules
        val detection = FinancialNotificationDetector.evaluate(packageName, title, text)
        if (!detection.isFinancial) {
            // Rule 14 & ING-03: Discard silently. Never log or store non-financial content.
            return
        }

        // Financial notification detected! Log only non-sensitive metadata (Rule 15)
        Log.i(TAG, "Financial movement detected from source: $packageName (Direction: ${detection.direction})")

        NotificationCaptureEventBus.post(
            CapturedNotification(
                packageName = packageName,
                maskedText = text ?: "",
                currency = detection.amount?.currency ?: "BOB",
                amount = detection.amount?.displayAmount ?: "0",
                direction = detection.direction?.name ?: "Expense",
                reference = detection.reference
            )
        )
    }

    companion object {
        private const val TAG = "BillefyCapture"
    }
}
