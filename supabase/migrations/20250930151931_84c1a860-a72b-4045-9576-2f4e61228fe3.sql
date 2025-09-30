-- Allow anonymous users to read quotes (for shared itinerary links)
CREATE POLICY "Allow anonymous read access to quotes"
ON public.quotes
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read tours (for itinerary display)
CREATE POLICY "Allow anonymous read access to tours"
ON public.tours
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read and write itineraries (for shared itinerary editing)
CREATE POLICY "Allow anonymous read access to itineraries"
ON public.itineraries
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous write access to itineraries"
ON public.itineraries
FOR ALL
TO anon
USING (true)
WITH CHECK (true);