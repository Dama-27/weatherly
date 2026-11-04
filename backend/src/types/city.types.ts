export interface City {
    CityCode: string;
    CityName: string;
    Temp: string;
    Status: string;
    lat?: number;
    lon?: number;
}

export interface CitiesPayload {
  List: City[];
}
