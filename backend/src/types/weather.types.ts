import type { CurrentWeather } from './weather-domain.types';

export * from './weather-domain.types';

export interface WeatherData {
    id?: number;
    name?: string;
    cityCode?: number;
    cityName?: string;
    coord?: {
        lon?: number;
        lat?: number;
    };
    weather: Array<{
        id?: number;
        main?: string;
        description: string;
        icon?: string;
    }>;
    main: {
        temp: number;
        feels_like: number;
        pressure?: number;
        humidity: number;
    };
    wind: {
        speed: number;
        deg?: number;
    };
    clouds?: {
        all?: number;
    };
    rain?: {
        '1h'?: number;
    };
    dt?: number;
    sys?: {
        country?: string;
        sunrise?: number;
        sunset?: number;
    };
    timezone?: number;
}

export interface RankedWeatherData {
    comfortIndex: number;
    rank: number;
    weatherData: WeatherData;
    normalizedWeather?: CurrentWeather;
}
