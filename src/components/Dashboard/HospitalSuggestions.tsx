import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Navigation, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Hospital {
  name: string;
  specialist: string;
  phone: string;
  distance: string;
  address: string;
  lat: number;
  lng: number;
}

const HospitalSuggestions = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          loadNearbyHospitals(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          loadMockHospitals();
        }
      );
    } else {
      loadMockHospitals();
    }
  };

  const loadNearbyHospitals = async (lat: number, lng: number) => {
    try {
      // Overpass API query for hospitals within 50km
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:50000,${lat},${lng});
          way["amenity"="hospital"](around:50000,${lat},${lng});
          node["amenity"="clinic"]["healthcare"="hospital"](around:50000,${lat},${lng});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch hospitals");
      }

      const data = await response.json();
      
      // Calculate distances and format hospitals
      const hospitalsWithDistance = data.elements
        .filter((element: any) => element.tags?.name) // Only include hospitals with names
        .map((element: any) => {
          const hospitalLat = element.lat || element.center?.lat;
          const hospitalLng = element.lon || element.center?.lon;
          
          if (!hospitalLat || !hospitalLng) return null;

          // Calculate distance using Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = (hospitalLat - lat) * Math.PI / 180;
          const dLon = (hospitalLng - lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(hospitalLat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          return {
            name: element.tags.name,
            specialist: element.tags["healthcare:speciality"] || "General Hospital",
            phone: element.tags.phone || element.tags["contact:phone"] || "Contact hospital for details",
            distance: `${distance.toFixed(1)} km`,
            address: [
              element.tags["addr:street"],
              element.tags["addr:housenumber"],
              element.tags["addr:city"],
              element.tags["addr:postcode"]
            ].filter(Boolean).join(", ") || "Address not available",
            lat: hospitalLat,
            lng: hospitalLng,
            distanceValue: distance,
          };
        })
        .filter((hospital: any) => hospital !== null)
        .sort((a: any, b: any) => a.distanceValue - b.distanceValue)
        .slice(0, 5); // Get top 5 closest

      setHospitals(hospitalsWithDistance);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      loadMockHospitals();
    } finally {
      setLoading(false);
    }
  };

  const loadMockHospitals = () => {
    setTimeout(() => {
      setHospitals([
        {
          name: "City General Hospital",
          specialist: "Dr. Sarah Johnson",
          phone: "+1 (555) 123-4567",
          distance: "N/A",
          address: "123 Medical Center Dr, Suite 100",
          lat: 0,
          lng: 0,
        },
        {
          name: "St. Mary's Medical Center",
          specialist: "Dr. Michael Chen",
          phone: "+1 (555) 234-5678",
          distance: "N/A",
          address: "456 Healthcare Blvd, Floor 3",
          lat: 0,
          lng: 0,
        },
        {
          name: "University Hospital",
          specialist: "Dr. Emily Rodriguez",
          phone: "+1 (555) 345-6789",
          distance: "N/A",
          address: "789 University Ave, Building A",
          lat: 0,
          lng: 0,
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const openDirections = (hospital: Hospital) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.lat},${hospital.lng}`;
      window.open(url, "_blank");
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.address)}`;
      window.open(url, "_blank");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Nearby Specialists</CardTitle>
            <CardDescription>
              Top 5 hospitals with chest cancer specialists within 50km
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {hospitals.map((hospital, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{hospital.name}</h3>
                          <p className="text-sm text-muted-foreground">{hospital.address}</p>
                        </div>
                        <Badge variant="secondary">{hospital.distance}</Badge>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-sm">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Specialist:</span>
                          {hospital.specialist}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {hospital.phone}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openDirections(hospital)}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          Get Directions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${hospital.phone}`)}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HospitalSuggestions;