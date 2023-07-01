import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.scss'
import { Provider } from 'react-redux'
import {store} from "./store/store.js";

ReactDOM.createRoot(document.getElementById('root')).render(
<Provider store={store}>
<App/>
</Provider>
//here i remove the react strict mode hence api is not called two times.
)
 