import { GeoPoint, Timestamp } from "firebase/firestore";

type Event = {
  id: string;
  title: string;
  type: string;
  saintId: string;
  description: string;
  saintName: string;
  dateTime: Timestamp;
  locationName: string;
  locationGeo: GeoPoint; // GeoPoint for map coordinates
};

type Saint = {
  id: string;
  name: string;
  designation: string;
  location: string;
  guruName: string;
  sect: string;
  about: string;
  dateOfDiksha: string;
  gender: string;
  amber: string;
  groupLeader: string;
};

export type { Event, Saint };