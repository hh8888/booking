const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [date, setDate] = useState('');
const [time, setTime] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  const { data, error } = await supabase
    .from('bookings')
    .insert([{ name, email, date, time }]);
  if (error) console.log('Error:', error);
  else {
    setName('');
    setEmail('');
    setDate('');
    setTime('');
    fetchBookings();
  }
};

return (
  <div>
    <h1>Bookings</h1>
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit">Book</button>
    </form>
    <ul>
      {bookings.map((booking) => (
        <li key={booking.id}>
          {booking.name} - {booking.date} at {booking.time}
        </li>
      ))}
    </ul>
  </div>
);