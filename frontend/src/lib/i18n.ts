import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'


const ru = {
    login: { title: 'Вход в систему', phone:'Номер телефона', password:'Пароль', submit:'Войти', register:'Регистрация' },
    sidebar: { create:'Создать заказ', dashboard:'Dashboard', menu:'Меню', orders:'Заказы', active:'Активные', closed:'Закрытые', settings:'Настройки', exit:'Выйти' },
}
const kz = {
    login: { title: 'Жүйеге кіру', phone:'Телефон нөмірі', password:'Құпиясөз', submit:'Кіру', register:'Тіркеу' },
    sidebar: { create:'Тапсырыс құру', dashboard:'Бақылау', menu:'Мәзір', orders:'Тапсырыстар', active:'Белсенді', closed:'Жабық', settings:'Баптаулар', exit:'Шығу' },
}


i18n.use(initReactI18next).init({ resources:{ ru:{translation:ru}, kz:{translation:kz} }, lng:'ru', fallbackLng:'ru' })
export default i18n