import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import Home from './views/Home.vue'
import About from './views/About.vue'
import './side-effect'
import { somePlugin } from './plugins/some-plugin'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
})

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.use(somePlugin)
app.mount('#app')