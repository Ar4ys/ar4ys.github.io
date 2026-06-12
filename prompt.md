Write me a very simple but still pretty webpage (html/css/js) that will accept a timetable, convert it to .ics file and allow user to download it. The page:
- should have the instructions on the left in desktop view, at the top on mobile
- should have a textarea to paste the schedule into
- then goes a checkbox labeled "Add notification (input type number, default 5) minutes before each (event/item/task? pick or come up with a name for items here pls)"
- add also a clear button to easily clear the textarea
- on each change to textarea - validate the pasted schedule and show in green "Everything looks good!" or red "The schedule looks incorrect - ask Artur Yurko about it" if validation fails
- then goes a button "Download Schedule"
- when user presses the button - we parse the schedule, generate an .ics and trigger browser download
- if there is an error during it - print "Ooops, failed to generate the schedule. Please, ask Artur Yurko about it."
- Tag: Thursday - 11.06.2026
- Tag: Friday - 12.06.2026
- Tag: Saturday - 13.06.2026
- Tag: Sunday - 14.06.2026

Instructions for the user:
1. Copy the schedule that "FlensMUN - Schedule Bot" sent you in Slack
2. Paste it here
3. Download the calendar events file
4. Open the file in your calendar or just click/tap on it - it should open automatically
5. Save the events
6. Profit!

Example of the schedule:
```
Zeitplan für Artur Yurko
Tag: Friday - FlensMUN Day 2
Time    ToDo    Location
08:15    Arrival    OSLO
08:20    Set-up Rooms    -
08:30    Team breakfast    OSL247
08:45    Registration Shift    OSLO hallway
09:00    Team Feedback    OSL247
11:00    Shift done    OSLO hallway
11:00    Coffee Break    OSL247
13:00    Set-up Lunch Break Room    OSL247
13:30    Conference Picture outside with Santi!    Uni Campus
13:35    Team Pictures outside with Santi    Uni Campus
13:40    Lunch + Lunch Break    OSL247
14:30    Tidy up Lunch Room    OSL247
16:15    Set-up Coffee Break Room    OSL247
16:30    Coffee Break    OSL247
18:30    Tidy up all rooms    -
18:45    Team Feedback    OSL247
18:55    Team Debrief    OSL247
19:50    Meet at bus station to go to the PiratenNest    Bus station ZOB
19:55    Join the busride to PiratenNest    Bus station ZOB
20:10    Arrive at PiratenNest    PiratenNest
20:15    Have fun and get home safely whenever it is that you're leaving!!!    PiratenNest
```
