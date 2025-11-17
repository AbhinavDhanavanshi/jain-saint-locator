import { GeoPoint, Timestamp, DocumentReference } from "firebase/firestore";
import { RefObject } from "react";

type Event = {
  id: string; // The document ID
  title: string;
  type: string;
  saintId: DocumentReference; // The reference to the saint doc
  description: string;
  saintName: string;
  dateTime: Timestamp;
  address: string; // The name/address of the location
  locationGeo: GeoPoint;// GeoPoint for map coordinates
};

type Saint = {
  id: string; // The document ID
  name: string;
  designation: string;
  location: string; // e.g., "Jaipur, Rajasthan"
  coordinates: string; // e.g., "[26.55° N, 76.49° E]"
  guruName: string;
  guru: DocumentReference; // This is a DocumentReference, storing as string (path)
  sect: string;
  about: string;
  dateOfDiksha?: Timestamp | { seconds: number; nanoseconds?: number } | number | string | Date | null;
  gender: string;
  amber: string;
  groupLeader: DocumentReference;
};

export type { Event, Saint };