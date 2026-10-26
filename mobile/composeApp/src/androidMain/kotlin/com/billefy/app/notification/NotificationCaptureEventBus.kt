package com.billefy.app.notification

data class CapturedNotification(
    val packageName: String,
    val maskedText: String,
    val currency: String,
    val amount: String,
    val direction: String,
    val reference: String?
)

object NotificationCaptureEventBus {
    private val listeners = mutableListOf<(CapturedNotification) -> Unit>()
    private val _recentCaptures = mutableListOf<CapturedNotification>()
    val recentCaptures: List<CapturedNotification> get() = _recentCaptures.toList()

    fun subscribe(listener: (CapturedNotification) -> Unit) {
        listeners.add(listener)
    }

    fun unsubscribe(listener: (CapturedNotification) -> Unit) {
        listeners.remove(listener)
    }

    fun post(captured: CapturedNotification) {
        _recentCaptures.add(0, captured)
        if (_recentCaptures.size > 20) {
            _recentCaptures.removeAt(_recentCaptures.size - 1)
        }
        listeners.forEach { it.invoke(captured) }
    }
}
