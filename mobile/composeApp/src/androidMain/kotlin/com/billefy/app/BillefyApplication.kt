package com.billefy.app

import android.app.Application

class BillefyApplication : Application() {
    lateinit var container: AndroidAppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AndroidAppContainer(this)
    }
}
