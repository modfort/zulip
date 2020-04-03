zrequire('people');

const return_false = function () { return false; };
const return_true = function () { return true; };
set_global('reload_state', {
    is_in_progress: return_false,
});

const me = {
    email: 'me@example.com',
    user_id: 30,
    full_name: 'Me Myself',
    timezone: 'US/Pacific',
};

people.init();
people.add(me);
people.initialize_current_user(me.user_id);

run_test('report_late_add', () => {
    blueslip.expect('error', 'Added user late: user_id=55 email=foo@example.com');
    people.report_late_add(55, 'foo@example.com');
    assert.equal(blueslip.get_test_logs('error').length, 1);
    blueslip.reset();

    reload_state.is_in_progress = return_true;
    people.report_late_add(55, 'foo@example.com');
    assert.equal(blueslip.get_test_logs('log').length, 1);
    assert.equal(blueslip.get_test_logs('log')[0].message, 'Added user late: user_id=55 email=foo@example.com');
    assert.equal(blueslip.get_test_logs('error').length, 0);
    blueslip.reset();
});

run_test('is_my_user_id', () => {
    blueslip.reset();
    blueslip.expect('error', 'user_id is a string in my_user_id: 999');
    assert.equal(people.is_my_user_id('999'), false);

    blueslip.expect('error', 'user_id is a string in my_user_id: 30');
    assert.equal(people.is_my_user_id(me.user_id.toString()), true);

    assert.equal(blueslip.get_test_logs('error').length, 2);
});

run_test('blueslip', () => {
    const unknown_email = "alicebobfred@example.com";

    blueslip.expect('debug', 'User email operand unknown: ' + unknown_email);
    people.id_matches_email_operand(42, unknown_email);
    assert.equal(blueslip.get_test_logs('debug').length, 1);
    blueslip.reset();

    blueslip.expect('error', 'Unknown user_id: 9999');
    people.get_actual_name_from_user_id(9999);
    assert.equal(blueslip.get_test_logs('error').length, 1);
    blueslip.reset();

    blueslip.expect('error', 'Unknown email for get_user_id: ' + unknown_email);
    people.get_user_id(unknown_email);
    assert.equal(blueslip.get_test_logs('error').length, 1);
    blueslip.reset();

    blueslip.expect('warn', 'No user_id provided for person@example.com');
    const person = {
        email: 'person@example.com',
        user_id: undefined,
        full_name: 'Person Person',
    };
    people.add(person);
    assert.equal(blueslip.get_test_logs('warn').length, 1);
    blueslip.reset();

    blueslip.expect('error', 'No user_id found for person@example.com');
    const user_id = people.get_user_id('person@example.com');
    assert.equal(user_id, undefined);
    assert.equal(blueslip.get_test_logs('error').length, 1);
    blueslip.reset();

    blueslip.expect('warn', 'Unknown user ids: 1,2');
    people.user_ids_string_to_emails_string('1,2');
    assert.equal(blueslip.get_test_logs('warn').length, 1);
    blueslip.reset();

    blueslip.expect('warn', 'Unknown emails: ' + unknown_email);
    people.email_list_to_user_ids_string([unknown_email]);
    assert.equal(blueslip.get_test_logs('warn').length, 1);
    blueslip.reset();

    let message = {
        type: 'private',
        display_recipient: [],
        sender_id: me.user_id,
    };
    blueslip.expect('error', 'Empty recipient list in message');
    people.pm_with_user_ids(message);
    people.group_pm_with_user_ids(message);
    people.all_user_ids_in_pm(message);
    assert.equal(people.pm_perma_link(message), undefined);
    assert.equal(blueslip.get_test_logs('error').length, 4);
    blueslip.reset();

    const charles = {
        email: 'charles@example.com',
        user_id: 451,
        full_name: 'Charles Dickens',
        avatar_url: 'charles.com/foo.png',
    };
    const maria = {
        email: 'athens@example.com',
        user_id: 452,
        full_name: 'Maria Athens',
    };
    people.add(charles);
    people.add(maria);

    message = {
        type: 'private',
        display_recipient: [
            {id: maria.user_id},
            {id: 42},
            {id: charles.user_id},
        ],
        sender_id: charles.user_id,
    };
    blueslip.expect('error', 'Unknown user id in message: 42');
    const reply_to = people.pm_reply_to(message);
    assert(reply_to.includes('?'));
    assert.equal(blueslip.get_test_logs('error').length, 1);
    blueslip.reset();

    people.pm_with_user_ids = function () { return [42]; };
    people.get_by_user_id = function () { return; };
    blueslip.expect('error', 'Unknown people in message');
    const uri = people.pm_with_url({});
    assert.equal(uri.indexOf('unk'), uri.length - 3);
    assert.equal(blueslip.get_test_logs('error').length, 1);
    blueslip.reset();

    blueslip.expect('error', 'Undefined field id');
    assert.equal(people.my_custom_profile_data(undefined), undefined);

    blueslip.expect('error', 'Trying to set undefined field id');
    people.set_custom_profile_field_data(maria.user_id, {});
});
