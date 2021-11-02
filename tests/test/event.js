const { expectRevert, time } = require('@openzeppelin/test-helpers');
const EventContract = artifacts.require('EventContract.sol');

contract('EventContract', (accounts) => {
  let eventContract = null;
  before(async () => {
    eventContract = await EventContract.new();
  });

  it('Should NOT create an event if date if before now', async () => {
    const now = Math.floor(Date.now() / 1000)
    await expectRevert(
      eventContract.createEvent(
        "Event Nah",
        now - 100,
        200,
        1000
      ),
      'can only organize event at a future date'
    )
  });

  it('Should NOT create an event if less than 1 ticket', async () => {
    const now = Math.floor(Date.now() / 1000)
    await expectRevert(
      eventContract.createEvent(
        "Event Nah",
        now + 100,
        200,
        0
      ),
      'can only organize event with at least 1 ticket'
    )
  });

  it('Should create an event', async () => {
    const now = Math.floor(Date.now() / 1000)
    await eventContract.createEvent(
      "Event 1",
      now + 100,
      200,
      1000,
      { from: accounts[0] }
    )
    const actualEvent = await eventContract.events(0);
    assert(actualEvent.name === "Event 1")
    assert(actualEvent.admin === accounts[0])
    assert(actualEvent.date.toNumber() === now + 100)
    assert(actualEvent.price.toNumber() === 200)
    assert(actualEvent.ticketCount.toNumber() === 1000)
    assert(actualEvent.ticketRemaining.toNumber() === 1000)
  });

  it('Should NOT buy a ticket if event does not exist', async () => {
    await expectRevert(
      eventContract.buyTicket(1, 2),
      'this event does not exist'
    )
  });

  context('event created', () => {
    beforeEach(async () => {
      const date = (await time.latest()).add(time.duration.seconds(1000));
      await eventContract.createEvent('event1', date, 5, 2);
    });

    it('Should NOT buy a ticket if wrong amount of ether sent', async () => {
      await expectRevert(
        eventContract.buyTicket(1, 1, { from: accounts[0], value: 25 }),
        'ether sent must be equal to total ticket cost'
      )
    });

    it('Should NOT buy a ticket if not enough ticket left', async () => {
      await eventContract.buyTicket(2, 2, { from: accounts[0], value: 10 })
      await expectRevert(
        eventContract.buyTicket(2, 1, { from: accounts[0], value: 5 }),
        'not enough ticket left'
      )
    });

    it('Should buy tickets', async () => {
      await eventContract.buyTicket(3, 2, { from: accounts[0], value: 10 })
      assert((await eventContract.tickets(accounts[0], 3)).toNumber() === 2)
    });

    it('Should NOT transfer ticket it not enough tickets', async () => {
      await expectRevert(
        eventContract.transferTicket(4, 1, accounts[1], { from: accounts[0] }),
        'not enough ticket'
      )
    });

    it('Should transfer ticket', async () => {
      await eventContract.buyTicket(5, 2, { from: accounts[0], value: 10 })
      await eventContract.transferTicket(5, 1, accounts[1], { from: accounts[0] })
      assert((await eventContract.tickets(accounts[0], 5)).toNumber() === 1)
      assert((await eventContract.tickets(accounts[1], 5)).toNumber() === 1)
    });

    it('Should NOT buy a ticket if event has expired', async () => {
      await time.increase(1000001);
      await expectRevert(
        eventContract.buyTicket(6, 1, { from: accounts[0], value: 5 }),
        'event has expired'
      )
    });
  });
});
